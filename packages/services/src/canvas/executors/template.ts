import { TemplateNodeConfigSchema } from "@openplane/types/canvas";
import ejs from "ejs";
import Handlebars from "handlebars";
import mustache from "mustache";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const handlebarsEngine = Handlebars.create();

handlebarsEngine.registerHelper("json", (value: unknown) =>
  JSON.stringify(value, null, 2)
);
handlebarsEngine.registerHelper("uppercase", (value: unknown) =>
  String(value ?? "").toUpperCase()
);
handlebarsEngine.registerHelper("lowercase", (value: unknown) =>
  String(value ?? "").toLowerCase()
);
handlebarsEngine.registerHelper(
  "truncate",
  (value: unknown, length?: number) => {
    const text = String(value ?? "");
    const limit = Number.isFinite(length) ? Number(length) : 100;
    if (limit <= 0) {
      return "";
    }
    if (text.length <= limit) {
      return text;
    }
    return `${text.slice(0, limit)}...`;
  }
);
handlebarsEngine.registerHelper(
  "formatDate",
  (value: unknown, format?: string) => {
    let date: Date | null = null;

    if (value instanceof Date) {
      date = value;
    } else if (value !== undefined && value !== null) {
      date = new Date(value as string | number);
    }

    if (!date || Number.isNaN(date.getTime())) {
      return "";
    }
    const variant = String(format ?? "date").toLowerCase();
    switch (variant) {
      case "time":
        return date.toLocaleTimeString("en-US");
      case "datetime":
        return date.toLocaleString("en-US");
      case "iso":
        return date.toISOString();
      default:
        return date.toLocaleDateString("en-US");
    }
  }
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenValue(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  const entries = Object.entries(value).filter(
    ([, entry]) => !Array.isArray(entry)
  );
  return Object.fromEntries(entries);
}

function normalizeTemplateName(name: string): string {
  return name.trim();
}

function resolveVariableValue(
  input: unknown,
  name: string,
  defaultValue?: unknown
): unknown {
  if (!name) {
    return defaultValue;
  }
  if (isRecord(input)) {
    if (input[name] !== undefined && input[name] !== null) {
      return input[name];
    }
    const flattened = flattenValue(input);
    if (flattened[name] !== undefined && flattened[name] !== null) {
      return flattened[name];
    }
  }
  return defaultValue;
}

function placeholderFor(syntax: string, name: string): string {
  if (syntax === "ejs") {
    return `<%= ${name} %>`;
  }
  return `{{${name}}}`;
}

function buildContext(params: {
  input: unknown;
  variables: Array<{
    name: string;
    required: boolean;
    defaultValue?: unknown;
  }>;
  undefinedVariable: "empty" | "error" | "placeholder";
  strict: boolean;
  syntax: string;
}): Record<string, unknown> {
  const base =
    params.input && isRecord(params.input)
      ? { ...flattenValue(params.input) }
      : {};

  const context: Record<string, unknown> = {
    ...base,
    input: params.input,
    data: params.input,
  };

  if (Array.isArray(params.input)) {
    context.items = params.input;
  }

  if (!(isRecord(params.input) || Array.isArray(params.input))) {
    context.value = params.input;
  }

  const missingRequired: string[] = [];

  for (const variable of params.variables) {
    const name = normalizeTemplateName(variable.name);
    if (!name) {
      continue;
    }
    const current =
      context[name] ??
      resolveVariableValue(params.input, name, variable.defaultValue);
    const hasValue = current !== undefined && current !== null;

    if (hasValue) {
      context[name] = current;
      continue;
    }

    if (variable.defaultValue !== undefined) {
      context[name] = variable.defaultValue;
      continue;
    }

    if (
      variable.required &&
      (params.undefinedVariable === "error" || params.strict)
    ) {
      missingRequired.push(variable.name);
      continue;
    }

    if (params.undefinedVariable === "placeholder") {
      context[name] = placeholderFor(params.syntax, name);
      continue;
    }

    context[name] = "";
  }

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required variables: ${missingRequired.join(", ")}`
    );
  }

  return context;
}

function renderTemplate(params: {
  syntax: "handlebars" | "mustache" | "ejs";
  template: string;
  context: Record<string, unknown>;
  escapeHtml: boolean;
  strict: boolean;
}): string {
  switch (params.syntax) {
    case "handlebars": {
      const compiled = handlebarsEngine.compile(params.template, {
        noEscape: !params.escapeHtml,
        strict: params.strict,
      });
      return compiled(params.context);
    }
    case "mustache": {
      type MustacheWriter = mustache.Writer & {
        escape: (value: string) => string;
      };
      const writer = new mustache.Writer() as MustacheWriter;
      writer.escape = params.escapeHtml
        ? mustache.escape
        : (value: string) => String(value);
      return writer.render(params.template, params.context);
    }
    case "ejs":
      return ejs.render(params.template, params.context, {
        escape: params.escapeHtml
          ? ejs.escapeXML
          : (value: string) => String(value),
      });
    default:
      throw new Error(`Unsupported template syntax: ${params.syntax}`);
  }
}

function normalizeOutput(
  value: string,
  options: {
    trimWhitespace: boolean;
    preserveNewlines: boolean;
    maxOutputLength?: number;
  }
): string {
  let output = value;

  if (!options.preserveNewlines) {
    output = output.replace(/\r?\n/g, " ");
  }

  if (options.trimWhitespace) {
    output = output.trim();
  }

  if (options.maxOutputLength && output.length > options.maxOutputLength) {
    throw new Error("Template output exceeds maximum length");
  }

  return output;
}

function finalizeOutput(params: {
  output: string;
  outputFormat: "text" | "json" | "markdown" | "html" | "xml";
  validateJson: boolean;
}): unknown {
  if (params.outputFormat !== "json") {
    return params.output;
  }

  try {
    return JSON.parse(params.output);
  } catch (error) {
    if (params.validateJson) {
      throw error;
    }
    return params.output;
  }
}

export const templateExecutor: CanvasNodeExecutor = ({ node, input }) => {
  const config = TemplateNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const variables = config.variables ?? [];
    const context = buildContext({
      input,
      variables,
      undefinedVariable: config.undefinedVariable ?? "placeholder",
      strict: config.validation?.strict ?? false,
      syntax: config.syntax ?? "handlebars",
    });

    const rendered = renderTemplate({
      syntax: config.syntax ?? "handlebars",
      template: config.template ?? "",
      context,
      escapeHtml: config.escapeHtml ?? false,
      strict: config.validation?.strict ?? false,
    });

    const normalized = normalizeOutput(rendered, {
      trimWhitespace: config.trimWhitespace ?? true,
      preserveNewlines: config.preserveNewlines ?? true,
      maxOutputLength:
        config.validation?.enabled === false
          ? undefined
          : config.validation?.maxOutputLength,
    });

    return finalizeOutput({
      output: normalized,
      outputFormat: config.outputFormat ?? "text",
      validateJson:
        config.validation?.enabled === false
          ? false
          : (config.validation?.validateJson ?? false),
    });
  } catch (error) {
    const fallbackBehavior = config.fallbackBehavior ?? "preserve";

    if (fallbackBehavior === "empty") {
      return "";
    }

    if (fallbackBehavior === "preserve") {
      return config.template ?? "";
    }

    const message = error instanceof Error ? error.message : String(error);

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
