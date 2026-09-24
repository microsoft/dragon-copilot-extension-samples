import { Router } from 'express';
import {
  BODY_PART_CHOICES,
  CAPABILITY_CHOICES,
  DEFAULT_OUTPUT_CONTENT_TYPE,
  INPUT_TYPE_CHOICES,
  MANIFEST_DEFAULTS,
  MODALITY_CHOICES,
  OUTPUT_TYPE_CHOICES,
  TOOL_TYPE_CHOICES,
  buildManifest,
  buildManifestFromTemplate,
  listTemplateSummaries,
  renderManifestYaml,
} from '../cli/radiologists/index.js';
import type {
  Capability,
  DcrExtensionManifest,
  RelevanceFilteringCriteria,
  ToolInput,
  ToolType,
} from '../cli/radiologists/index.js';
import { describeManifest, summarizeManifest, validateManifestDocument } from '../services/manifest-schema.js';
import { createLogger } from '../utils/logger.js';

/**
 * Runs the Dragon Copilot CLI's manifest generation inside the sandbox.
 *
 * The CLI's manifest core is imported as a library (it is synced into
 * `src/cli/radiologists` from `tools/dragon-copilot-cli`), never spawned as a
 * binary: the browser collects the same answers the CLI wizard prompts for, and
 * the server assembles the manifest with the CLI's own code so both surfaces
 * emit identical YAML.
 */
export const cliRouter = Router();

const log = createLogger('cli');

/** The only domain the sandbox can validate and test against today. */
const SUPPORTED_DOMAIN = 'radiologists';

interface ExtensionRequestFields {
  name?: unknown;
  description?: unknown;
  version?: unknown;
  radiologistsExtensibilityApiVersion?: unknown;
}

interface OutputRequestFields {
  name?: unknown;
  description?: unknown;
  schemaVersion?: unknown;
}

interface ToolRequestFields {
  name?: unknown;
  description?: unknown;
  toolType?: unknown;
  capability?: unknown;
  endpoint?: unknown;
  inputTypes?: unknown;
  outputs?: unknown;
  relevanceFilteringCriteria?: {
    relevantBodyParts?: unknown;
    relevantModalities?: unknown;
  };
}

interface GenerateRequestBody {
  domain?: unknown;
  mode?: unknown;
  template?: unknown;
  tenantId?: unknown;
  extension?: ExtensionRequestFields;
  tool?: ToolRequestFields;
}

/** Request-shape problem, reported before any manifest is assembled. */
class BadRequestError extends Error {}

/**
 * Reads a trimmed string from untrusted input.
 *
 * A field that is absent, non-string, or blank all mean the same thing here —
 * "the caller did not supply this" — so all three yield `fallback`. That matches
 * the CLI, where submitting an empty prompt accepts the offered default, and
 * keeps the two surfaces emitting the same manifest for the same answers.
 */
function asString(value: unknown, fallback = ''): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function requireTenantId(body: GenerateRequestBody): string {
  const tenantId = asString(body.tenantId);
  if (!tenantId) {
    throw new BadRequestError('A tenant ID is required. Provide the Azure Entra ID tenant your extension is deployed to.');
  }
  return tenantId;
}

/**
 * GET /api/cli/options
 * Describes what the wizard can generate: templates, selectable values, and the
 * field defaults the CLI prompts offer. Sourced from the CLI so the sandbox
 * never hard-codes a second copy of them.
 */
cliRouter.get('/options', (_req, res) => {
  res.json({
    domain: SUPPORTED_DOMAIN,
    templates: listTemplateSummaries(),
    inputTypes: INPUT_TYPE_CHOICES,
    outputTypes: OUTPUT_TYPE_CHOICES,
    toolTypes: TOOL_TYPE_CHOICES,
    capabilities: CAPABILITY_CHOICES,
    bodyParts: BODY_PART_CHOICES,
    modalities: MODALITY_CHOICES,
    outputContentType: DEFAULT_OUTPUT_CONTENT_TYPE,
    defaults: MANIFEST_DEFAULTS,
  });
});

/**
 * POST /api/cli/generate
 * Generates a manifest from either a built-in template or the answers the
 * wizard collected, and returns it as YAML ready to load into the editor.
 */
cliRouter.post('/generate', (req, res) => {
  const body = (req.body ?? {}) as GenerateRequestBody;

  const domain = asString(body.domain, SUPPORTED_DOMAIN);
  if (domain !== SUPPORTED_DOMAIN) {
    log.warn(`Generate rejected: unsupported domain '${domain}'.`);
    res.status(400).json({
      generated: false,
      errors: [{ path: null, message: `Unsupported domain '${domain}'.`, severity: 'error' }],
      message: `This sandbox generates '${SUPPORTED_DOMAIN}' manifests only.`,
    });
    return;
  }

  const mode = asString(body.mode, 'template');

  let manifest: DcrExtensionManifest;
  try {
    manifest = mode === 'custom' ? buildCustomManifest(body) : buildTemplateManifest(body);
  } catch (err: unknown) {
    // Only a BadRequestError describes something the caller can fix, so only its
    // message is safe to echo back. Anything else is a fault on our side: report
    // it as a 500 and keep the internal detail in the server log.
    if (err instanceof BadRequestError) {
      log.warn(`Generate rejected: ${err.message}`);
      res.status(400).json({
        generated: false,
        errors: [{ path: null, message: err.message, severity: 'error' }],
        message: err.message,
      });
      return;
    }

    log.error(`Generate failed unexpectedly: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    const message = 'Manifest generation failed unexpectedly. Check the sandbox server log for details.';
    res.status(500).json({
      generated: false,
      errors: [{ path: null, message, severity: 'error' }],
      message,
    });
    return;
  }

  const yamlContent = renderManifestYaml(manifest);

  // The wizard cannot express every schema rule (name casing, GUID shape, …), so
  // the generated manifest goes through the same validation as an uploaded one.
  // Its YAML is still returned, letting the editor show the errors in context.
  const result = validateManifestDocument(manifest, yamlContent);
  if (!result.valid) {
    log.warn(`Generated manifest failed validation with ${result.errors.length} error(s).`);
    for (const e of result.errors) {
      log.warn(`Generated manifest invalid at ${e.path}${e.line !== null ? ` (line ${e.line})` : ''}: ${e.detail}`);
    }

    res.status(422).json({
      generated: true,
      valid: false,
      yaml: yamlContent,
      errors: result.errors,
      message: `Generated manifest failed validation with ${result.errors.length} error(s). Fix the highlighted fields and validate again.`,
    });
    return;
  }

  const summary = summarizeManifest(result.manifest);
  log.info(
    `Generated ${mode === 'custom' ? 'custom' : `'${asString(body.template)}' template`} manifest ` +
    `'${summary.name}' v${summary.version} with ${summary.toolCount} tool(s).`,
  );

  res.json({
    generated: true,
    valid: true,
    yaml: yamlContent,
    manifest: summary,
    message: describeManifest(summary),
  });
});

/**
 * Builds a manifest from a built-in CLI template, mirroring
 * `dragon-copilot radiologists generate --template <name>`.
 */
function buildTemplateManifest(body: GenerateRequestBody): DcrExtensionManifest {
  const template = asString(body.template);
  const available = listTemplateSummaries().map((summary) => summary.id);

  if (!template) {
    throw new BadRequestError(`A template is required. Available templates: ${available.join(', ')}.`);
  }

  // Checked here rather than letting `buildManifestFromTemplate` throw, so that
  // an unknown name is a typed 400 and anything else escaping the manifest core
  // is treated as the unexpected fault it is.
  if (!available.includes(template)) {
    throw new BadRequestError(`Template '${template}' not found. Available templates: ${available.join(', ')}.`);
  }

  const tenantId = requireTenantId(body);

  return buildManifestFromTemplate(template, { tenantId });
}

/**
 * Builds a manifest from wizard answers, mirroring `dragon-copilot radiologists init`.
 */
function buildCustomManifest(body: GenerateRequestBody): DcrExtensionManifest {
  const tenantId = requireTenantId(body);
  const extension = body.extension ?? {};
  const tool = body.tool;

  if (!tool || typeof tool !== 'object') {
    throw new BadRequestError('A tool definition is required. Add at least one tool to the manifest.');
  }

  const outputs = Array.isArray(tool.outputs) ? (tool.outputs as OutputRequestFields[]) : [];
  if (outputs.length === 0) {
    throw new BadRequestError('At least one output is required for the tool.');
  }
  if (outputs.some((output) => !output || typeof output !== 'object')) {
    throw new BadRequestError('Each output must be an object with a name and description.');
  }

  const toolInput: ToolInput = {
    name: asString(tool.name),
    description: asString(tool.description),
    endpoint: asString(tool.endpoint),
    inputTypes: asStringArray(tool.inputTypes),
    outputs: outputs.map((output) => ({
      name: asString(output.name),
      description: asString(output.description),
      schemaVersion: asString(output.schemaVersion, MANIFEST_DEFAULTS.schemaVersion),
    })),
  };

  const toolType = asString(tool.toolType);
  if (toolType) {
    toolInput.toolType = toolType as ToolType;
  }

  const capability = asString(tool.capability);
  if (capability) {
    toolInput.capability = capability as Capability;
  }

  const criteria = readRelevanceFilteringCriteria(tool);
  if (criteria) {
    toolInput.relevanceFilteringCriteria = criteria;
  }

  return buildManifest({
    extension: {
      name: asString(extension.name, MANIFEST_DEFAULTS.extensionName),
      description: asString(extension.description, MANIFEST_DEFAULTS.extensionDescription),
      version: asString(extension.version, MANIFEST_DEFAULTS.version),
      radiologistsExtensibilityApiVersion: asString(
        extension.radiologistsExtensibilityApiVersion,
        MANIFEST_DEFAULTS.radiologistsExtensibilityApiVersion,
      ),
    },
    auth: { tenantId },
    tools: [toolInput],
  });
}

/**
 * Reads relevance filtering criteria from the request. Empty selections are
 * dropped by the manifest core, which leaves the tool unfiltered.
 */
function readRelevanceFilteringCriteria(tool: ToolRequestFields): RelevanceFilteringCriteria | undefined {
  const criteria = tool.relevanceFilteringCriteria;
  if (!criteria || typeof criteria !== 'object') return undefined;

  return {
    relevantBodyParts: asStringArray(criteria.relevantBodyParts),
    relevantModalities: asStringArray(criteria.relevantModalities),
  };
}
