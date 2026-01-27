import { z } from "zod";

export const ConnectorNodeConfigSchema = z.object({
  connectorId: z.string().optional(),
  connectorType: z.string(),
  operation: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type ConnectorNodeConfig = z.infer<typeof ConnectorNodeConfigSchema>;

export const ToolNodeConfigSchema = z.object({
  toolId: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type ToolNodeConfig = z.infer<typeof ToolNodeConfigSchema>;

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const HttpRequestNodeConfigSchema = z.object({
  url: z.string(),
  method: HttpMethodSchema.default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  timeoutMs: z.number().positive().default(30_000),
  retryOn5xx: z.boolean().default(true),
  validateStatus: z.array(z.number()).optional(),
  responseType: z.enum(["json", "text", "blob"]).default("json"),
});

export type HttpRequestNodeConfig = z.infer<typeof HttpRequestNodeConfigSchema>;

export const DatabaseQueryNodeConfigSchema = z.object({
  connectionId: z.string(),
  query: z.string(),
  parameters: z.array(z.unknown()).optional(),
  timeout: z.number().positive().default(30_000),
  readOnly: z.boolean().default(true),
  maxRows: z.number().positive().default(1000),
});

export type DatabaseQueryNodeConfig = z.infer<
  typeof DatabaseQueryNodeConfigSchema
>;

export const GraphqlQueryNodeConfigSchema = z.object({
  endpoint: z.string(),
  query: z.string(),
  variables: z.record(z.string(), z.unknown()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  operationName: z.string().optional(),
  timeoutMs: z.number().positive().default(30_000),
});

export type GraphqlQueryNodeConfig = z.infer<
  typeof GraphqlQueryNodeConfigSchema
>;
