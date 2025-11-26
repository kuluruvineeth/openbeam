/**
 * Prompt Variable Injection
 *
 * Utilities for injecting variables into prompt templates.
 */

/**
 * Variable pattern: {variableName} or {{variableName}}
 */
const VARIABLE_PATTERN = /\{\{?\s*(\w+)\s*\}?\}/g;

/**
 * Inject variables into a template
 */
export function injectVariables(
  template: string,
  variables: Record<string, string | number | boolean | undefined>
): string {
  return template.replace(VARIABLE_PATTERN, (match, varName) => {
    const value = variables[varName];
    if (value === undefined) {
      console.warn(`Template variable "${varName}" not provided`);
      return match; // Keep original if not provided
    }
    return String(value);
  });
}

/**
 * Extract variable names from a template
 */
export function extractVariables(template: string): string[] {
  const variables: Set<string> = new Set();
  let match: RegExpExecArray | null;

  // Reset lastIndex
  VARIABLE_PATTERN.lastIndex = 0;

  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  template: string,
  variables: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const required = extractVariables(template);
  const missing = required.filter((v) => !(v in variables));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Escape special characters in variable values
 */
export function escapeForPrompt(value: string): string {
  // Escape characters that might interfere with prompt parsing
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

/**
 * Format a list for prompt inclusion
 */
export function formatList(
  items: string[],
  style: "numbered" | "bulleted" | "dashed" = "numbered"
): string {
  const prefixes = {
    numbered: (i: number) => `${i + 1}. `,
    bulleted: () => "• ",
    dashed: () => "- ",
  };

  const prefix = prefixes[style];
  return items.map((item, i) => `${prefix(i)}${item}`).join("\n");
}

/**
 * Format key-value pairs for prompt inclusion
 */
export function formatKeyValues(
  pairs: Record<string, string | number | boolean | undefined>,
  style: "inline" | "multiline" = "multiline"
): string {
  const entries = Object.entries(pairs).filter(([, v]) => v !== undefined);

  if (style === "inline") {
    return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
  }

  return entries.map(([k, v]) => `${k}: ${v}`).join("\n");
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Format a document for prompt inclusion
 */
export function formatDocument(
  title: string,
  content: string,
  metadata?: Record<string, string | number | boolean | undefined>
): string {
  const parts: string[] = [`[${title}]`];

  if (metadata) {
    const metaStr = formatKeyValues(metadata, "inline");
    if (metaStr) {
      parts.push(metaStr);
    }
  }

  parts.push("");
  parts.push(content);

  return parts.join("\n");
}

export default injectVariables;
