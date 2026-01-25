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

export const TemplateNodeConfigSchema = z.object({
  template: z.string(),
  language: z.enum(["handlebars", "mustache", "ejs"]).default("handlebars"),
});

export type TemplateNodeConfig = z.infer<typeof TemplateNodeConfigSchema>;

export const ScriptNodeConfigSchema = z.object({
  code: z.string(),
  runtime: z.enum(["javascript", "python"]).default("javascript"),
  timeoutMs: z.number().default(30_000),
});

export type ScriptNodeConfig = z.infer<typeof ScriptNodeConfigSchema>;
