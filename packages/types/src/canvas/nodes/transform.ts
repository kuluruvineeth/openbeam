import { z } from "zod";

export const TransformNodeConfigSchema = z.object({
  expression: z.string(),
  language: z.enum(["jmespath", "jsonata", "javascript"]).default("jmespath"),
});

export type TransformNodeConfig = z.infer<typeof TransformNodeConfigSchema>;

export const FilterNodeConfigSchema = z.object({
  expression: z.string(),
  language: z.enum(["jmespath", "jsonata", "javascript"]).default("jmespath"),
});

export type FilterNodeConfig = z.infer<typeof FilterNodeConfigSchema>;

export const TemplateSyntaxSchema = z.enum(["handlebars", "mustache", "ejs"]);

export type TemplateSyntax = z.infer<typeof TemplateSyntaxSchema>;

export const TemplateOutputFormatSchema = z.enum([
  "text",
  "json",
  "markdown",
  "html",
  "xml",
]);

export type TemplateOutputFormat = z.infer<typeof TemplateOutputFormatSchema>;

export const TemplateVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z
    .enum(["string", "number", "boolean", "array", "object", "any"])
    .default("any"),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  required: z.boolean().default(true),
  source: z.enum(["detected", "manual", "input"]).default("detected"),
});

export type TemplateVariable = z.infer<typeof TemplateVariableSchema>;

export const TemplatePresetSchema = z.enum([
  "blank",
  "email",
  "notification",
  "report",
  "api_response",
  "prompt",
  "structured_output",
  "data_transform",
]);

export type TemplatePreset = z.infer<typeof TemplatePresetSchema>;

export const TemplateValidationSchema = z.object({
  enabled: z.boolean().default(true),
  strict: z.boolean().default(false),
  validateJson: z.boolean().default(false),
  maxOutputLength: z.number().positive().optional(),
});

export type TemplateValidation = z.infer<typeof TemplateValidationSchema>;

export const TemplateNodeConfigSchema = z.object({
  template: z.string().default(""),
  syntax: TemplateSyntaxSchema.default("handlebars"),
  outputFormat: TemplateOutputFormatSchema.default("text"),

  variables: z.array(TemplateVariableSchema).default([]),
  preset: TemplatePresetSchema.optional(),

  validation: TemplateValidationSchema.default({
    enabled: true,
    strict: false,
    validateJson: false,
  }),

  trimWhitespace: z.boolean().default(true),
  escapeHtml: z.boolean().default(false),
  preserveNewlines: z.boolean().default(true),

  fallbackBehavior: z.enum(["empty", "error", "preserve"]).default("preserve"),
  undefinedVariable: z
    .enum(["empty", "error", "placeholder"])
    .default("placeholder"),

  testData: z.record(z.string(), z.unknown()).optional(),
});

export type TemplateNodeConfig = z.infer<typeof TemplateNodeConfigSchema>;

export const CodeRuntimeSchema = z.enum(["javascript", "typescript", "python"]);
export type CodeRuntime = z.infer<typeof CodeRuntimeSchema>;

export const CodeVariableTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "any",
]);
export type CodeVariableType = z.infer<typeof CodeVariableTypeSchema>;

export const InputVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: CodeVariableTypeSchema.default("any"),
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  sourceNodeId: z.string().optional(),
  sourcePath: z.string().optional(),
});
export type InputVariable = z.infer<typeof InputVariableSchema>;

export const OutputFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: CodeVariableTypeSchema.default("any"),
  description: z.string().optional(),
  nullable: z.boolean().default(false),
});
export type OutputField = z.infer<typeof OutputFieldSchema>;

export const ConsoleLogLevelSchema = z.enum(["log", "info", "warn", "error"]);
export type ConsoleLogLevel = z.infer<typeof ConsoleLogLevelSchema>;

export const ConsoleLogEntrySchema = z.object({
  level: ConsoleLogLevelSchema,
  message: z.string(),
  timestamp: z.number(),
});
export type ConsoleLogEntry = z.infer<typeof ConsoleLogEntrySchema>;

export const CodeExecutionErrorSchema = z.object({
  message: z.string(),
  line: z.number().optional(),
  column: z.number().optional(),
  stack: z.string().optional(),
});
export type CodeExecutionError = z.infer<typeof CodeExecutionErrorSchema>;

export const CodeExecutionResultSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: CodeExecutionErrorSchema.optional(),
  logs: z.array(ConsoleLogEntrySchema).default([]),
  executionTimeMs: z.number(),
  memoryUsedBytes: z.number().optional(),
});
export type CodeExecutionResult = z.infer<typeof CodeExecutionResultSchema>;

export const CodeNodeConfigSchema = z.object({
  runtime: CodeRuntimeSchema.default("javascript"),
  code: z.string().default(""),
  inputVariables: z.array(InputVariableSchema).default([]),
  outputSchema: z.array(OutputFieldSchema).default([]),
  timeoutMs: z.number().default(30_000),
  memoryLimitMb: z.number().default(128),
  sandboxed: z.boolean().default(true),
  retryOnError: z.boolean().default(false),
  maxRetries: z.number().default(3),
  enableConsole: z.boolean().default(true),
  testInput: z.string().optional(),
  lastExecution: CodeExecutionResultSchema.optional(),
});
export type CodeNodeConfig = z.infer<typeof CodeNodeConfigSchema>;

export const CodeTemplateCategorySchema = z.enum([
  "transform",
  "filter",
  "aggregate",
  "http",
  "utility",
]);
export type CodeTemplateCategory = z.infer<typeof CodeTemplateCategorySchema>;

export const CodeTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  runtime: CodeRuntimeSchema,
  code: z.string(),
  category: CodeTemplateCategorySchema,
});
export type CodeTemplate = z.infer<typeof CodeTemplateSchema>;

export const ScriptNodeConfigSchema = CodeNodeConfigSchema;
export type ScriptNodeConfig = CodeNodeConfig;
