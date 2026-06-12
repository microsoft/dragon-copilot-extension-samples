import { Router, Request, Response, NextFunction } from 'express';
import { readFileSync } from 'node:fs';
import multer, { MulterError } from 'multer';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ExtensionManifest } from '../schemas/manifest.schema.js';
import { sessionStore } from '../store/session.js';
import { buildDetailedErrors } from '../utils/validation-hints.js';
import { mapPathsToLines } from '../utils/source-mapper.js';
import { getToolsForCapability } from '../utils/tool-metadata.js';
import { parseCapabilities } from '../utils/capabilities-parser.js';
import { MANIFEST_SCHEMA_PATH } from '../utils/schema-path.js';

export const manifestRouter = Router();

const upload = multer({
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.json', '.yaml', '.yml'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type '${ext}'. Accepted: .json, .yaml, .yml`));
    }
  },
});

// Load the Dragon Copilot extension manifest JSON schema
const manifestJsonSchema = JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, 'utf-8'));

const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(manifestJsonSchema);

/**
 * POST /api/manifest/upload
 * Accepts a manifest file (JSON or YAML), validates it, and stores it in session.
 */
manifestRouter.post('/upload', upload.single('manifest'), (req, res) => {
  if (!req.file) {
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: 'No file uploaded', severity: 'error' }],
      message: 'No manifest file provided.',
    });
    return;
  }

  const fileContent = req.file.buffer.toString('utf-8');
  const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));

  // Parse file content
  let parsed: unknown;
  try {
    if (ext === '.json') {
      parsed = JSON.parse(fileContent);
    } else {
      parsed = yaml.load(fileContent);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: `Failed to parse file: ${message}`, severity: 'error' }],
      message: 'File could not be parsed as JSON or YAML.',
      rawContent: fileContent,
    });
    return;
  }

  // Ensure parsed content is a plain object (yaml.load can return scalars or arrays)
  if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: 'Manifest must be a YAML/JSON object.', severity: 'error' }],
      message: 'File content is not a valid manifest object.',
      rawContent: fileContent,
    });
    return;
  }

  // Validate against schema
  const isValid = validate(parsed);

  if (!isValid) {
    const rawErrors = validate.errors ?? [];
    // Compute precise target paths for line resolution.
    // For 'required' errors, AJV points to the parent — extend to the missing property.
    // For 'additionalProperties', extend to the extra property.
    const targetPaths = rawErrors.map((err) => {
      const base = err.instancePath || '/';
      const params = err.params as Record<string, unknown>;
      if (err.keyword === 'required' && params.missingProperty) {
        const sep = base === '/' ? '' : '/';
        return `${base}${sep}${params.missingProperty}`;
      }
      if (err.keyword === 'additionalProperties' && params.additionalProperty) {
        const sep = base === '/' ? '' : '/';
        return `${base}${sep}${params.additionalProperty}`;
      }
      return base;
    });
    const lineMap = mapPathsToLines(fileContent, targetPaths);
    // Remap results back to the original instancePaths for buildDetailedErrors,
    // but we pass the targetPaths-keyed map directly since buildDetailedErrors
    // will look up by the same target path.
    const errors = buildDetailedErrors(rawErrors, lineMap, targetPaths);

    res.status(422).json({
      valid: false,
      errors,
      message: `Manifest validation failed with ${errors.length} error(s).`,
      rawContent: fileContent,
    });
    return;
  }

  const manifest = parsed as ExtensionManifest;
  sessionStore.setManifest(manifest, fileContent);

  // Extract capabilities
  const capabilities = [...new Set(manifest.tools.map((t) => t.capability))];

  res.json({
    valid: true,
    manifest: {
      name: manifest.name,
      version: manifest.version,
      toolCount: manifest.tools.length,
      capabilities,
    },
    message: `Manifest is valid. ${manifest.tools.length} tool(s) found across ${capabilities.length} capability(ies).`,
  });
});

/**
 * POST /api/manifest/validate
 * Accepts raw manifest text (JSON or YAML) in the request body and validates it.
 */
manifestRouter.post('/validate', (req, res) => {
  const { content } = req.body as { content: string };

  if (!content || typeof content !== 'string') {
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: 'No content provided.', severity: 'error' }],
      message: 'Request body must include a "content" string.',
    });
    return;
  }

  // Try parsing as JSON first, then YAML
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    try {
      parsed = yaml.load(content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown parse error';
      res.status(400).json({
        valid: false,
        errors: [{ path: null, message: `Failed to parse: ${message}`, severity: 'error' }],
        message: 'Content could not be parsed as JSON or YAML.',
      });
      return;
    }
  }

  if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: 'Manifest must be a YAML/JSON object.', severity: 'error' }],
      message: 'Content is not a valid manifest object.',
    });
    return;
  }

  const isValid = validate(parsed);

  if (!isValid) {
    const rawErrors = validate.errors ?? [];
    const targetPaths = rawErrors.map((err) => {
      const base = err.instancePath || '/';
      const params = err.params as Record<string, unknown>;
      if (err.keyword === 'required' && params.missingProperty) {
        const sep = base === '/' ? '' : '/';
        return `${base}${sep}${params.missingProperty}`;
      }
      if (err.keyword === 'additionalProperties' && params.additionalProperty) {
        const sep = base === '/' ? '' : '/';
        return `${base}${sep}${params.additionalProperty}`;
      }
      return base;
    });
    const lineMap = mapPathsToLines(content, targetPaths);
    const errors = buildDetailedErrors(rawErrors, lineMap, targetPaths);

    res.status(422).json({
      valid: false,
      errors,
      message: `Manifest validation failed with ${errors.length} error(s).`,
    });
    return;
  }

  const manifest = parsed as ExtensionManifest;
  sessionStore.setManifest(manifest, content);

  const capabilities = [...new Set(manifest.tools.map((t) => t.capability))];
  res.json({
    valid: true,
    manifest: {
      name: manifest.name,
      version: manifest.version,
      toolCount: manifest.tools.length,
      capabilities,
    },
    message: `Manifest is valid. ${manifest.tools.length} tool(s) found across ${capabilities.length} capability(ies).`,
  });
});

/**
 * GET /api/manifest
 * Returns the currently loaded manifest metadata (or 404 if none).
 */
manifestRouter.get('/', (_req, res) => {
  const manifest = sessionStore.getManifest();
  if (!manifest) {
    res.status(404).json({ error: 'No manifest loaded. Upload a manifest first.' });
    return;
  }

  const capabilities = [...new Set(manifest.tools.map((t) => t.capability))];
  res.json({
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    toolCount: manifest.tools.length,
    capabilities,
  });
});

/**
 * GET /api/manifest/capabilities
 * Returns parsed capabilities grouped by the tool `capability` field.
 */
manifestRouter.get('/capabilities', (_req, res) => {
  const manifest = sessionStore.getManifest();
  if (!manifest) {
    res.status(404).json({ error: 'No manifest loaded. Upload a manifest first.' });
    return;
  }

  res.json(parseCapabilities(manifest));
});

/**
 * GET /api/manifest/capabilities/:capabilityName/tools
 * Returns tools defined under a given capability.
 */
manifestRouter.get('/capabilities/:capabilityName/tools', (req, res) => {
  const manifest = sessionStore.getManifest();
  if (!manifest) {
    res.status(404).json({ error: 'No manifest loaded. Upload a manifest first.' });
    return;
  }

  const { capabilityName } = req.params;
  const tools = getToolsForCapability(manifest, capabilityName);

  if (tools === null) {
    res.status(404).json({ error: 'Capability not found in manifest.' });
    return;
  }

  res.json(tools);
});

/**
 * DELETE /api/manifest
 * Clears the current session manifest.
 */
manifestRouter.delete('/', (_req, res) => {
  sessionStore.clear();
  res.json({ message: 'Manifest cleared.' });
});

/**
 * GET /api/manifest/raw
 * Returns the raw manifest text (YAML/JSON) as uploaded.
 */
manifestRouter.get('/raw', (_req, res) => {
  const raw = sessionStore.getRawManifestText();
  if (!raw) {
    res.status(404).json({ error: 'No manifest loaded.' });
    return;
  }
  res.json({ content: raw });
});

/**
 * POST /api/manifest/execute
 * Executes a tool by proxying the request to the tool's endpoint.
 */
manifestRouter.post('/execute', async (req, res) => {
  const manifest = sessionStore.getManifest();
  if (!manifest) {
    res.status(404).json({ error: 'No manifest loaded.' });
    return;
  }

  const { capability, tool: toolName, inputs } = req.body as {
    capability: string;
    tool: string;
    inputs: Record<string, string>;
  };

  if (!capability || !toolName) {
    res.status(400).json({ error: 'capability and tool are required.' });
    return;
  }

  const tool = manifest.tools.find(
    (t) => t.capability === capability && t.name === toolName
  );

  if (!tool) {
    res.status(404).json({ error: `Tool '${toolName}' not found in capability '${capability}'.` });
    return;
  }

  // Build the payload based on tool inputs
  const payload: Record<string, unknown> = {};
  for (const input of tool.inputs) {
    if (inputs[input.name] !== undefined) {
      payload[input.name] = inputs[input.name];
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(tool.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    let responseBody: unknown;
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({
      error: `Failed to reach tool endpoint: ${message}`,
      endpoint: tool.endpoint,
    });
  }
});

/**
 * Multer-specific error handling middleware.
 * Returns 400 with actionable messages for file-size and file-type errors.
 */
export function multerErrorHandler(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        valid: false,
        errors: [{ path: null, message: 'File too large. Maximum size is 1MB.', severity: 'error' }],
        message: 'File exceeds the maximum allowed size of 1MB.',
      });
      return;
    }
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: err.message, severity: 'error' }],
      message: `Upload error: ${err.message}`,
    });
    return;
  }
  if (err.message && err.message.startsWith('Unsupported file type')) {
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: err.message, severity: 'error' }],
      message: err.message,
    });
    return;
  }
  next(err);
}
