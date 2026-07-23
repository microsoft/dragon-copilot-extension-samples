/**
 * Parses form input values (strings) into their appropriate types.
 * Only parses values that look like JSON objects or arrays — primitive-looking
 * strings (numbers, booleans) are kept as strings to avoid silent type coercion
 * of clinical identifiers like MRNs or accession numbers.
 */
export function parseInputValues(inputs: Record<string, string>): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(inputs)) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        parsed[key] = JSON.parse(value);
      } catch {
        parsed[key] = value;
      }
    } else {
      parsed[key] = value;
    }
  }
  return parsed;
}

/**
 * Groups flat dot-delimited field paths (e.g. "report.reportText") into nested
 * objects keyed by the input name. Non-dotted keys are kept as-is.
 * Empty/null/undefined values are omitted from the result.
 */
export function groupInputsByName(parsedInputs: Record<string, unknown>): Record<string, unknown> {
  const grouped: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(parsedInputs)) {
    const dotIndex = path.indexOf('.');
    if (dotIndex > 0) {
      const inputName = path.slice(0, dotIndex);
      const fieldName = path.slice(dotIndex + 1);
      if (!grouped[inputName] || typeof grouped[inputName] !== 'object') {
        grouped[inputName] = {};
      }
      if (value !== '' && value !== null && value !== undefined) {
        (grouped[inputName] as Record<string, unknown>)[fieldName] = value;
      }
    } else {
      if (value !== '' && value !== null && value !== undefined) {
        grouped[path] = value;
      }
    }
  }
  return grouped;
}

/**
 * Convenience: parse raw string inputs and group them by name in one step.
 */
export function parseAndGroupInputs(inputs: Record<string, string>): Record<string, unknown> {
  return groupInputsByName(parseInputValues(inputs));
}
