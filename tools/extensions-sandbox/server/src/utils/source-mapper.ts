/**
 * Maps JSON Pointer paths (e.g., "/tools/0/name") to approximate line numbers
 * in the original source file (JSON or YAML).
 */

/**
 * Given the raw file content and a list of JSON Pointer instance paths,
 * returns a Map from path to line number (1-based). Returns undefined for
 * paths that cannot be located.
 */
export function mapPathsToLines(
  source: string,
  paths: string[],
): Map<string, number | undefined> {
  const lines = source.split(/\r?\n/);
  const result = new Map<string, number | undefined>();

  for (const path of paths) {
    if (!path || path === '/') {
      result.set(path, 1);
      continue;
    }
    const lineNumber = findLineForPath(lines, path);
    result.set(path, lineNumber);
  }

  return result;
}

/**
 * Finds the line number for a single JSON Pointer path by walking the
 * path segments top-down and locating each key/index in the source lines.
 * Returns the deepest line found — if the final segment isn't in the source
 * (e.g., a missing required property), returns the deepest resolved parent line.
 */
function findLineForPath(lines: string[], path: string): number | undefined {
  const segments = path.split('/').filter(Boolean);
  let searchStart = 0;
  let lastResolved = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isArrayIndex = /^\d+$/.test(segment);

    if (isArrayIndex) {
      const index = parseInt(segment, 10);
      const found = findNthArrayItem(lines, searchStart, index, segments[i - 1]);
      if (found !== undefined) {
        searchStart = found;
        lastResolved = found;
      }
    } else {
      const found = findKeyInLines(lines, searchStart, segment);
      if (found !== undefined) {
        searchStart = found;
        lastResolved = found;
      } else {
        // Key not found (e.g., missing property) — stay at parent location
        break;
      }
    }
  }

  // Return 1-based line number
  return lastResolved + 1;
}

/**
 * Finds the line where a specific key appears (JSON or YAML), starting from startLine.
 */
function findKeyInLines(lines: string[], startLine: number, key: string): number | undefined {
  // Match patterns: "key": (JSON) or key: (YAML) or "key" : (with spaces)
  const jsonPattern = new RegExp(`"${escapeRegex(key)}"\\s*:`);
  const yamlPattern = new RegExp(`^\\s*${escapeRegex(key)}\\s*:`);
  const yamlQuotedPattern = new RegExp(`^\\s*["']${escapeRegex(key)}["']\\s*:`);

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (jsonPattern.test(line) || yamlPattern.test(line) || yamlQuotedPattern.test(line)) {
      return i;
    }
  }

  return undefined;
}

/**
 * Locates the Nth array item starting from a given line.
 * In JSON: looks for array items by counting opening braces/brackets after a "[".
 * In YAML: looks for "- " prefixed items.
 */
function findNthArrayItem(
  lines: string[],
  startLine: number,
  index: number,
  _parentKey?: string,
): number | undefined {
  let itemCount = -1;
  let inArray = false;
  let arrayIndent = -1;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Detect YAML array items (lines starting with "- ")
    if (trimmed.startsWith('- ')) {
      const currentIndent = line.length - line.trimStart().length;
      if (!inArray) {
        inArray = true;
        arrayIndent = currentIndent;
        itemCount++;
        if (itemCount === index) return i;
      } else if (currentIndent === arrayIndent) {
        itemCount++;
        if (itemCount === index) return i;
      } else if (currentIndent < arrayIndent) {
        // Left the array
        break;
      }
    }

    // Detect JSON arrays: count top-level items after "["
    if (!inArray && (trimmed === '[' || trimmed.endsWith('['))) {
      inArray = true;
      arrayIndent = line.length - line.trimStart().length;
      continue;
    }

    if (inArray && !trimmed.startsWith('- ')) {
      // In a JSON-style array, count objects/values by their opening.
        // NOTE: This is a rough heuristic that may miscount items in manifests
        // with deeply nested arrays or arrays of primitives. Line numbers for
        // JSON array items are best-effort; YAML source mapping is more reliable.
        if (trimmed.startsWith('{') || (trimmed.startsWith('"') && !trimmed.includes(':'))) {
        const currentIndent = line.length - line.trimStart().length;
        if (currentIndent > arrayIndent) {
          itemCount++;
          if (itemCount === index) return i;
        }
      }
    }
  }

  return undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
