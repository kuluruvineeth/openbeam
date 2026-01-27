import type { TemplateSyntax, TemplateVariable } from "@openplane/types/canvas";

const PREFIX_PATTERN = /^[@#/^]/;
const SPLIT_PATTERN = /[\s.]/;
const IDENTIFIER_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const UNCLOSED_BRACE_PATTERN = /\{\{(?:[^{}]|\{(?!\{)|\}(?!\}))*$/;

const SYNTAX_PATTERNS: Record<TemplateSyntax, RegExp> = {
  handlebars:
    /\{\{(?:#each |#if |#unless |#with |\/each|\/if|\/unless|\/with)?([^{}]+?)(?:\s+[^{}]*)?\}\}/g,
  mustache: /\{\{(?:#|\/|\^)?([^{}]+?)\}\}/g,
  ejs: /<%[=\-_]?\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*%>/g,
};

const HANDLEBARS_HELPERS = new Set([
  "if",
  "unless",
  "each",
  "with",
  "else",
  "this",
  "lookup",
  "log",
  "json",
  "formatDate",
  "uppercase",
  "lowercase",
  "truncate",
]);

export function detectVariables(
  template: string,
  syntax: TemplateSyntax
): TemplateVariable[] {
  const pattern = SYNTAX_PATTERNS[syntax];
  const variables = new Map<string, TemplateVariable>();

  let match: RegExpExecArray | null = pattern.exec(template);
  while (match !== null) {
    const rawName = match[1]?.trim();
    if (rawName) {
      const name = extractVariableName(rawName);
      if (name && !isHelperOrKeyword(name, syntax) && !variables.has(name)) {
        variables.set(name, {
          id: generateVariableId(name),
          name,
          type: inferType(name, template),
          required: !isOptionalContext(match[0]),
          source: "detected",
        });
      }
    }
    match = pattern.exec(template);
  }

  return Array.from(variables.values());
}

function extractVariableName(raw: string): string | null {
  const cleaned = raw.replace(PREFIX_PATTERN, "").trim();
  const parts = cleaned.split(SPLIT_PATTERN);
  const name = parts[0];

  if (!(name && IDENTIFIER_PATTERN.test(name))) {
    return null;
  }

  return name;
}

function isHelperOrKeyword(name: string, syntax: TemplateSyntax): boolean {
  if (syntax === "handlebars" || syntax === "mustache") {
    return HANDLEBARS_HELPERS.has(name.toLowerCase());
  }
  return false;
}

function isOptionalContext(fullMatch: string): boolean {
  return fullMatch.includes("#if ") || fullMatch.includes("#unless ");
}

function inferType(name: string, template: string): TemplateVariable["type"] {
  const lowerName = name.toLowerCase();

  if (
    lowerName.includes("count") ||
    lowerName.includes("num") ||
    lowerName.includes("amount")
  ) {
    return "number";
  }
  if (
    lowerName.includes("is") ||
    lowerName.includes("has") ||
    lowerName.includes("enabled")
  ) {
    return "boolean";
  }
  if (
    lowerName.includes("items") ||
    lowerName.includes("list") ||
    lowerName.includes("array")
  ) {
    return "array";
  }
  if (
    lowerName.includes("data") ||
    lowerName.includes("config") ||
    lowerName.includes("options")
  ) {
    return "object";
  }

  if (template.includes(`#each ${name}`)) {
    return "array";
  }

  return "string";
}

function generateVariableId(name: string): string {
  return `var_${name}_${Date.now().toString(36).slice(-4)}`;
}

export function validateTemplate(
  template: string,
  _syntax: TemplateSyntax
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const openTags = (template.match(/\{\{#/g) || []).length;
  const closeTags = (template.match(/\{\{\//g) || []).length;

  if (openTags !== closeTags) {
    errors.push(
      `Unmatched block tags: ${openTags} opening, ${closeTags} closing`
    );
  }

  if (UNCLOSED_BRACE_PATTERN.test(template)) {
    errors.push("Unclosed template expression");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
