import type { ErrorObject } from 'ajv';

interface DetailedValidationError {
  path: string;
  line: number | null;
  message: string;
  detail: string;
  hint: string;
  severity: 'error';
}

/**
 * Generates a user-friendly hint based on the AJV error keyword and schema context.
 */
function getHintForError(err: ErrorObject): { detail: string; hint: string } {
  const path = err.instancePath || '/';
  const keyword = err.keyword;
  const params = err.params as Record<string, unknown>;
  const schemaPath = err.schemaPath || '';

  switch (keyword) {
    case 'required': {
      const missing = params.missingProperty as string;
      return getRequiredPropertyHint(path, missing, schemaPath);
    }

    case 'additionalProperties': {
      const extra = params.additionalProperty as string;
      return {
        detail: `Unexpected property '${extra}' found at '${path}'.`,
        hint: `Remove the '${extra}' property. Only properties defined in the schema are allowed. Check the manifest specification for valid fields at this level.`,
      };
    }

    case 'enum': {
      const allowed = (params.allowedValues as string[]) ?? [];
      return getEnumHint(path, allowed, schemaPath);
    }

    case 'pattern': {
      return getPatternHint(path, params.pattern as string, schemaPath);
    }

    case 'format': {
      const format = params.format as string;
      if (format === 'uri') {
        return {
          detail: `The value at '${path}' is not a valid URI.`,
          hint: `Provide a fully qualified URL starting with 'https://' (e.g., 'https://api.example.com/v1/process'). The endpoint must be a valid, absolute URI.`,
        };
      }
      return {
        detail: `The value at '${path}' does not match the expected '${format}' format.`,
        hint: `Ensure the value conforms to the '${format}' format specification.`,
      };
    }

    case 'type': {
      const expected = params.type as string;
      return {
        detail: `Expected type '${expected}' at '${path}'.`,
        hint: `Change the value at '${path}' to be of type '${expected}'. For example: ${getTypeExample(expected)}.`,
      };
    }

    case 'minLength': {
      const min = params.limit as number;
      return {
        detail: `The string at '${path}' is too short (minimum ${min} character${min > 1 ? 's' : ''}).`,
        hint: `Provide a non-empty string value for '${path}'. This field cannot be blank.`,
      };
    }

    case 'minItems': {
      const min = params.limit as number;
      return {
        detail: `The array at '${path}' must have at least ${min} item(s).`,
        hint: `Add at least ${min} item(s) to the '${path}' array. For example, tools must define at least one input and one output.`,
      };
    }

    case 'minimum': {
      const min = params.limit as number;
      return {
        detail: `The value at '${path}' must be >= ${min}.`,
        hint: `Set the value at '${path}' to ${min} or greater.`,
      };
    }

    default:
      return {
        detail: `Validation failed at '${path}': ${err.message ?? keyword}.`,
        hint: `Review the manifest schema documentation for the expected structure at '${path}'.`,
      };
  }
}

function getRequiredPropertyHint(path: string, missing: string, schemaPath: string): { detail: string; hint: string } {
  const location = path || 'root';

  // Tool-level required properties
  if (schemaPath.includes('DragonTool') || path.match(/\/tools\/\d+$/)) {
    const toolHints: Record<string, string> = {
      name: `Add a 'name' field using lowercase kebab-case (e.g., "chest-ct-quality").`,
      toolType: `Add a 'toolType' field. Allowed values: "contractBased", "uiBased", "mcpBased", "agentBased". Use "contractBased" for standard REST API integrations.`,
      capability: `Add a 'capability' field. Allowed values: "reportGeneration", "qualityCheck".`,
      description: `Add a 'description' field explaining what this tool does.`,
      endpoint: `Add an 'endpoint' field with the full HTTPS URL of your extension's /v1/process endpoint (e.g., "https://api.example.com/v1/process").`,
      inputs: `Add an 'inputs' array with at least one input definition. Each input needs 'name', 'description', and 'content-type'.`,
      outputs: `Add an 'outputs' array with at least one output definition. Each output needs 'name', 'description', and 'content-type'.`,
    };
    return {
      detail: `Missing required property '${missing}' in tool definition at '${location}'.`,
      hint: toolHints[missing] ?? `Add the required '${missing}' property to the tool definition.`,
    };
  }

  // Input-level required properties
  if (schemaPath.includes('DragonInput') || path.match(/\/inputs\/\d+$/)) {
    const inputHints: Record<string, string> = {
      name: `Add a 'name' field to identify this input (e.g., "report").`,
      description: `Add a 'description' field explaining what data this input expects.`,
      'content-type': `Add a 'content-type' field. Allowed values: "application/vnd.ms-dragon.dsp.rad.report+json", "application/vnd.ms-dragon.dsp.rad.patient-info+json".`,
    };
    return {
      detail: `Missing required property '${missing}' in input definition at '${location}'.`,
      hint: inputHints[missing] ?? `Add the required '${missing}' property to the input definition.`,
    };
  }

  // Output-level required properties
  if (schemaPath.includes('DragonOutput') || path.match(/\/outputs\/\d+$/)) {
    const outputHints: Record<string, string> = {
      name: `Add a 'name' field to identify this output (e.g., "quality-result").`,
      description: `Add a 'description' field explaining what this output produces.`,
      'content-type': `Add a 'content-type' field. Allowed value: "application/vnd.ms-dragon.dsp.rad.quality-result+json".`,
    };
    return {
      detail: `Missing required property '${missing}' in output definition at '${location}'.`,
      hint: outputHints[missing] ?? `Add the required '${missing}' property to the output definition.`,
    };
  }

  // Auth-level required properties
  if (schemaPath.includes('AuthConfig') || path === '/auth') {
    if (missing === 'tenantId') {
      return {
        detail: `Missing required property 'tenantId' in auth configuration.`,
        hint: `Add 'tenantId' with your Azure Entra ID tenant ID in GUID format (e.g., "12345678-1234-1234-1234-123456789abc").`,
      };
    }
  }

  // Top-level required properties
  const topLevelHints: Record<string, string> = {
    name: `Add a 'name' field at the root level using lowercase kebab-case (e.g., "my-extension").`,
    description: `Add a 'description' field at the root level explaining what your extension does.`,
    version: `Add a 'version' field in semver format (e.g., "1.0.0").`,
    auth: `Add an 'auth' object with a 'tenantId' property containing your Azure Entra ID tenant GUID.`,
    tools: `Add a 'tools' array with at least one tool definition.`,
  };

  return {
    detail: `Missing required property '${missing}' at '${location}'.`,
    hint: topLevelHints[missing] ?? `Add the required '${missing}' property.`,
  };
}

function getEnumHint(path: string, allowed: string[], schemaPath: string): { detail: string; hint: string } {
  if (path.includes('content-type') || schemaPath.includes('ContentType')) {
    if (schemaPath.includes('Input') || path.includes('/inputs/')) {
      return {
        detail: `Invalid input content-type at '${path}'.`,
        hint: `Use one of the supported input content types:\n  • "application/vnd.ms-dragon.dsp.rad.report+json" (radiology report)\n  • "application/vnd.ms-dragon.dsp.rad.patient-info+json" (patient demographics)`,
      };
    }
    if (schemaPath.includes('Output') || path.includes('/outputs/')) {
      return {
        detail: `Invalid output content-type at '${path}'.`,
        hint: `Use one of the supported output content types:\n  • "application/vnd.ms-dragon.dsp.rad.quality-result+json" (quality check findings)`,
      };
    }
  }

  if (path.endsWith('/toolType')) {
    return {
      detail: `Invalid tool type at '${path}'.`,
      hint: `Use one of: "contractBased" (REST API), "uiBased", "mcpBased", or "agentBased". Most extensions use "contractBased".`,
    };
  }

  if (path.endsWith('/capability')) {
    return {
      detail: `Invalid capability at '${path}'.`,
      hint: `Use one of: "reportGeneration" (for generating/modifying reports) or "qualityCheck" (for validating report quality).`,
    };
  }

  const allowedStr = allowed.length <= 10
    ? allowed.map((v) => `"${v}"`).join(', ')
    : `${allowed.slice(0, 5).map((v) => `"${v}"`).join(', ')}, ... (${allowed.length} total)`;

  return {
    detail: `Invalid value at '${path}'.`,
    hint: `Allowed values: ${allowedStr}.`,
  };
}

function getPatternHint(path: string, pattern: string, _schemaPath: string): { detail: string; hint: string } {
  if (pattern.includes('[a-z0-9]') && pattern.includes('-')) {
    return {
      detail: `The value at '${path}' does not match the required kebab-case format.`,
      hint: `Use lowercase letters, numbers, and hyphens only (e.g., "my-extension-name"). Must start and end with a letter or number. No spaces, uppercase, or special characters.`,
    };
  }

  if (pattern.includes('\\d+\\.\\d+\\.\\d+')) {
    return {
      detail: `The value at '${path}' is not a valid semantic version.`,
      hint: `Use the format "MAJOR.MINOR.PATCH" (e.g., "1.0.0", "0.2.1"). Only numeric values separated by dots are allowed.`,
    };
  }

  if (pattern.includes('[a-fA-F0-9]') && pattern.includes('-')) {
    return {
      detail: `The value at '${path}' is not a valid GUID/UUID.`,
      hint: `Use a standard UUID format: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" where x is a hex digit (e.g., "12345678-1234-1234-1234-123456789abc").`,
    };
  }

  return {
    detail: `The value at '${path}' does not match the required pattern.`,
    hint: `Expected pattern: ${pattern}. Review the schema for the required format.`,
  };
}

function getTypeExample(type: string): string {
  switch (type) {
    case 'string': return '"my-value"';
    case 'number': return '42';
    case 'integer': return '1';
    case 'boolean': return 'true or false';
    case 'array': return '[ ... ]';
    case 'object': return '{ ... }';
    default: return `a ${type} value`;
  }
}

/**
 * Transforms raw AJV errors into detailed validation errors with actionable hints.
 * When a lineMap is provided, each error includes the corresponding source line number.
 * targetPaths (optional) provides the keys used in lineMap when they differ from instancePath
 * (e.g., for 'required' errors where the lookup path includes the missing property name).
 */
export function buildDetailedErrors(
  errors: ErrorObject[],
  lineMap?: Map<string, number | undefined>,
  targetPaths?: string[],
): DetailedValidationError[] {
  return errors.map((err, index) => {
    const path = err.instancePath || '/';
    const { detail, hint } = getHintForError(err);
    const lookupKey = targetPaths?.[index] ?? path;
    const line = lineMap?.get(lookupKey) ?? null;

    return {
      path,
      line,
      message: `${path}: ${err.message}`,
      detail,
      hint,
      severity: 'error' as const,
    };
  });
}
