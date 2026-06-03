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
    });
    return;
  }

  // Ensure parsed content is a plain object (yaml.load can return scalars or arrays)
  if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: 'Manifest must be a YAML/JSON object.', severity: 'error' }],
      message: 'File content is not a valid manifest object.',
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
    });
    return;
  }

  const manifest = parsed as ExtensionManifest;
  sessionStore.setManifest(manifest);

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
 * DELETE /api/manifest
 * Clears the current session manifest.
 */
manifestRouter.delete('/', (_req, res) => {
  sessionStore.clear();
  res.json({ message: 'Manifest cleared.' });
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
