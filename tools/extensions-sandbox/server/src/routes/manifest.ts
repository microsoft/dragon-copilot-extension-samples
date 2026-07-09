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
import { callExtensionAsync, buildProcessRequest } from '../services/extension-client.js';
import { acquireToken, buildClaimChecks, AuthError } from '../services/auth.js';
import { parseAndGroupInputs } from 'extensions-sandbox-shared';
import { createLogger } from '../utils/logger.js';

export const manifestRouter = Router();

const log = createLogger('manifest');

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
    log.warn('Upload rejected: no file provided.');
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: 'No file uploaded', severity: 'error' }],
      message: 'No manifest file provided.',
    });
    return;
  }

  const fileContent = req.file.buffer.toString('utf-8');
  const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
  log.info(`Validating uploaded manifest '${req.file.originalname}' (${ext}, ${fileContent.length} bytes).`);

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
    log.error(`Manifest parse failed: ${message}`);
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
    log.warn(`Manifest schema validation failed with ${rawErrors.length} error(s).`);
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
    for (const e of errors) {
      log.warn(`Manifest invalid at ${e.path}${e.line !== null ? ` (line ${e.line})` : ''}: ${e.detail}`);
    }

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
  log.info(
    `Manifest '${manifest.name}' v${manifest.version} is valid: ` +
    `${manifest.tools.length} tool(s) across ${capabilities.length} capability(ies) [${capabilities.join(', ')}].`,
  );

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
    log.warn('Validate rejected: no content provided.');
    res.status(400).json({
      valid: false,
      errors: [{ path: null, message: 'No content provided.', severity: 'error' }],
      message: 'Request body must include a "content" string.',
    });
    return;
  }

  log.info(`Validating manifest content (${content.length} bytes).`);

  // Try parsing as JSON first, then YAML
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    try {
      parsed = yaml.load(content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown parse error';
      log.error(`Manifest parse failed: ${message}`);
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
    log.warn(`Manifest schema validation failed with ${rawErrors.length} error(s).`);
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
    for (const e of errors) {
      log.warn(`Manifest invalid at ${e.path}${e.line !== null ? ` (line ${e.line})` : ''}: ${e.detail}`);
    }

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
  log.info(
    `Manifest '${manifest.name}' v${manifest.version} is valid: ` +
    `${manifest.tools.length} tool(s) across ${capabilities.length} capability(ies) [${capabilities.join(', ')}].`,
  );
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

  const capabilities = parseCapabilities(manifest);
  log.info(
    `Parsed ${capabilities.length} capability(ies): ` +
    capabilities.map((c) => `${c.name} (${c.toolCount} tool(s))`).join(', '),
  );
  res.json(capabilities);
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
    log.warn(`Capability '${capabilityName}' not found in manifest.`);
    res.status(404).json({ error: 'Capability not found in manifest.' });
    return;
  }

  log.info(
    `Resolved ${tools.length} tool(s) for capability '${capabilityName}': ` +
    tools.map((t) => t.name).join(', '),
  );
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
 * Executes a tool by calling the extension's `v1/process` endpoint using the
 * Dragon Copilot (radiologists) Extensibility API contract — a ProcessRequest
 * envelope in, a ProcessResponse envelope out (see radiologists-extensibility-api.yaml).
 *
 * Body:
 *   - capability: string (required)
 *   - tool: string (required)
 *   - inputs: Record<string, string> (the capability inputs, keyed by input name)
 *   - customerTenantId: string (optional, defaults to a placeholder GUID)
 *   - bearerToken: string (optional, forwarded as Authorization: Bearer header)
 */
manifestRouter.post('/execute', async (req, res) => {
  const manifest = sessionStore.getManifest();
  if (!manifest) {
    res.status(404).json({ error: 'No manifest loaded.' });
    return;
  }

  const { capability, tool: toolName, inputs, customerTenantId, bearerToken } = req.body as {
    capability: string;
    tool: string;
    inputs: Record<string, string>;
    customerTenantId?: string;
    bearerToken?: string;
  };

  if (!capability || !toolName) {
    log.warn('Execute rejected: capability and tool are required.');
    res.status(400).json({ error: 'capability and tool are required.' });
    return;
  }

  const tool = manifest.tools.find(
    (t) => t.capability === capability && t.name === toolName
  );

  if (!tool) {
    log.warn(`Execute rejected: tool '${toolName}' not found in capability '${capability}'.`);
    res.status(404).json({ error: `Tool '${toolName}' not found in capability '${capability}'.` });
    return;
  }

  if (!tool.endpoint) {
    log.warn(`Execute rejected: tool '${toolName}' has no endpoint configured.`);
    res.status(400).json({ error: 'Tool endpoint is not configured in the manifest.' });
    return;
  }

  log.info(
    `Executing tool '${toolName}' (capability '${capability}') against endpoint ${tool.endpoint}. ` +
    `Inputs: [${Object.keys(inputs ?? {}).join(', ') || 'none'}].`,
  );

  // Clear any previously stored validation results – a new execution
  // invalidates prior results (the endpoint or manifest may have changed).
  sessionStore.clearValidationResults();

  // When service-to-service authentication is enabled, acquire an Entra ID
  // access token (client credentials flow) and forward it as a Bearer token.
  // When disabled, fall back to any bearerToken supplied directly in the body
  // (preserves the prior behavior for testing unauthenticated endpoints).
  let resolvedToken: string | undefined = bearerToken;
  let claimChecks: ReturnType<typeof buildClaimChecks> | undefined;
  const authConfig = sessionStore.getAuthConfig();
  if (authConfig.enabled) {
    try {
      const tokenResult = await acquireToken(authConfig);
      resolvedToken = tokenResult.accessToken;
      claimChecks = buildClaimChecks(tokenResult.claims, authConfig.tenantId);
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        res.status(401).json({
          error: `Authentication failed: ${err.message}`,
          cause: 'Entra ID token acquisition failed',
          category: err.category,
          entraCode: err.entraCode,
          troubleshooting: err.troubleshooting,
        });
        return;
      }
      // acquireToken only throws AuthError today, but handle any unexpected
      // error here so it never escapes to Express's default handler.
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({
        error: `Authentication failed: ${message}`,
        cause: 'Entra ID token acquisition failed',
      });
      return;
    }
  }

  try {
    const result = await callExtensionAsync({
      tool,
      inputs: inputs ?? {},
      customerTenantId: customerTenantId || '00000000-0000-0000-0000-000000000000',
      extensibilityApiVersion: manifest.radiologistsExtensibilityApiVersion,
      bearerToken: resolvedToken,
    });

    log.info(
      `Tool '${toolName}' responded ${result.status} ${result.statusText}. ` +
      `Recognized ProcessResponse envelope: ${result.processResponse ? 'yes' : 'no'}.`,
    );

    res.json({
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      processResponse: result.processResponse ?? null,
      rawBody: result.rawBody ?? null,
      sentRequest: result.sentRequest,
      authenticated: authConfig.enabled,
      claimChecks: claimChecks ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error(`Tool '${toolName}' call to ${tool.endpoint} failed: ${message}`);

    // Categorize the failure to provide actionable troubleshooting hints
    let cause: string;
    let troubleshooting: string[];

    if (message.includes('ECONNREFUSED')) {
      cause = 'Connection refused';
      troubleshooting = [
        'Ensure the extension service is running and listening on the configured port.',
        'Verify the endpoint URL in your manifest matches the running service address.',
        'Check firewall or network rules that may block the connection.',
      ];
    } else if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
      cause = 'DNS resolution failed';
      troubleshooting = [
        'The hostname in the endpoint URL could not be resolved.',
        'Check for typos in the endpoint URL.',
        'Ensure DNS is reachable from the sandbox environment.',
      ];
    } else if (message.includes('abort') || message.includes('timeout')) {
      cause = 'Request timed out';
      troubleshooting = [
        'The extension did not respond within the 30-second timeout.',
        'Verify the service is healthy and not overloaded.',
        'Consider increasing processing efficiency or timeout configuration.',
      ];
    } else if (message.includes('CERT') || message.includes('certificate') || message.includes('SSL')) {
      cause = 'TLS/SSL error';
      troubleshooting = [
        'The endpoint uses HTTPS but has an invalid or self-signed certificate.',
        'Use HTTP for local development or configure a trusted certificate.',
      ];
    } else {
      cause = 'Network error';
      troubleshooting = [
        'An unexpected error occurred while connecting to the tool endpoint.',
        'Check that the endpoint URL is correct and the service is reachable.',
      ];
    }

    // Build the request that was attempted so the Outputs tab can display it
    let sentRequest: unknown;
    try {
      const parsedInputs = parseAndGroupInputs(inputs ?? {});
      sentRequest = buildProcessRequest(tool, parsedInputs, {
        customerTenantId: customerTenantId || '00000000-0000-0000-0000-000000000000',
        extensibilityApiVersion: manifest.radiologistsExtensibilityApiVersion,
      });
    } catch { /* best-effort */ }

    res.status(502).json({
      error: `Failed to reach tool endpoint: ${message}`,
      endpoint: tool.endpoint,
      cause,
      troubleshooting,
      sentRequest,
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
