import { z } from "zod";

export const ConnectorNodeConfigSchema = z.object({
  connectorId: z.string().optional(),
  connectorType: z.string(),
  operation: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type ConnectorNodeConfig = z.infer<typeof ConnectorNodeConfigSchema>;

export const ParameterBindingModeSchema = z.enum([
  "static",
  "variable",
  "ai_inferred",
]);
export type ParameterBindingMode = z.infer<typeof ParameterBindingModeSchema>;

export const ParameterBindingSchema = z.object({
  mode: ParameterBindingModeSchema.default("static"),
  staticValue: z.unknown().optional(),
  variableRef: z.string().optional(),
  aiDescription: z.string().optional(),
});
export type ParameterBinding = z.infer<typeof ParameterBindingSchema>;

export const ToolRetryConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffMs: z.number().min(100).default(1000),
  exponential: z.boolean().default(true),
});
export type ToolRetryConfig = z.infer<typeof ToolRetryConfigSchema>;

export const ToolNodeConfigSchema = z.object({
  toolId: z.string(),
  toolCategory: z.string().optional(),
  parameterBindings: z.record(z.string(), ParameterBindingSchema).default({}),
  resultPath: z.string().optional(),
  resultVariable: z.string().optional(),
  timeoutMs: z.number().positive().default(30_000),
  retryConfig: ToolRetryConfigSchema.optional(),
  continueOnError: z.boolean().default(false),
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

export const KeyValuePairSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});
export type KeyValuePair = z.infer<typeof KeyValuePairSchema>;

export const HttpAuthTypeSchema = z.enum([
  "none",
  "basic",
  "bearer",
  "api_key",
  "oauth2",
  "custom_header",
]);
export type HttpAuthType = z.infer<typeof HttpAuthTypeSchema>;

export const HttpAuthConfigSchema = z.object({
  type: HttpAuthTypeSchema.default("none"),
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
  apiKeyName: z.string().optional(),
  apiKeyValue: z.string().optional(),
  apiKeyLocation: z.enum(["header", "query"]).optional(),
  oauth2TokenUrl: z.string().optional(),
  oauth2ClientId: z.string().optional(),
  oauth2ClientSecret: z.string().optional(),
  oauth2Scopes: z.string().optional(),
  customHeaderName: z.string().optional(),
  customHeaderValue: z.string().optional(),
});
export type HttpAuthConfig = z.infer<typeof HttpAuthConfigSchema>;

export const HttpBodyTypeSchema = z.enum([
  "none",
  "json",
  "form_urlencoded",
  "form_data",
  "raw",
  "binary",
  "xml",
]);
export type HttpBodyType = z.infer<typeof HttpBodyTypeSchema>;

export const HttpRetryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffMs: z.number().min(100).max(60_000).default(1000),
  retryOn: z.array(z.number()).default([429, 500, 502, 503, 504]),
});
export type HttpRetryConfig = z.infer<typeof HttpRetryConfigSchema>;

export const HttpResponseHandlingSchema = z.object({
  responseType: z
    .enum(["auto", "json", "text", "binary", "stream"])
    .default("auto"),
  followRedirects: z.boolean().default(true),
  maxRedirects: z.number().min(0).max(20).default(10),
  validateCertificate: z.boolean().default(true),
  parseResponse: z.boolean().default(true),
});
export type HttpResponseHandling = z.infer<typeof HttpResponseHandlingSchema>;

export const HttpRequestNodeConfigSchema = z.object({
  url: z.string(),
  method: HttpMethodSchema.default("GET"),

  headers: z.array(KeyValuePairSchema).default([]),
  queryParams: z.array(KeyValuePairSchema).default([]),

  auth: HttpAuthConfigSchema.default({ type: "none" }),

  bodyType: HttpBodyTypeSchema.default("none"),
  bodyContent: z.string().optional(),
  bodyFormFields: z.array(KeyValuePairSchema).optional(),

  retry: HttpRetryConfigSchema.default({
    enabled: true,
    maxAttempts: 3,
    backoffMs: 1000,
    retryOn: [429, 500, 502, 503, 504],
  }),

  response: HttpResponseHandlingSchema.default({
    responseType: "auto",
    followRedirects: true,
    maxRedirects: 10,
    validateCertificate: true,
    parseResponse: true,
  }),

  timeoutMs: z.number().positive().default(30_000),
  continueOnError: z.boolean().default(false),
});

export type HttpRequestNodeConfig = z.infer<typeof HttpRequestNodeConfigSchema>;

export const DatabaseEngineSchema = z.enum([
  "postgresql",
  "mysql",
  "mssql",
  "sqlite",
  "mariadb",
  "oracle",
]);
export type DatabaseEngine = z.infer<typeof DatabaseEngineSchema>;

export const DatabaseOperationSchema = z.enum([
  "execute_query",
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
]);
export type DatabaseOperation = z.infer<typeof DatabaseOperationSchema>;

export const QueryBatchModeSchema = z.enum([
  "single",
  "independent",
  "transaction",
]);
export type QueryBatchMode = z.infer<typeof QueryBatchModeSchema>;

export const QueryOutputFormatSchema = z.enum([
  "rows",
  "first_row",
  "count",
  "raw",
]);
export type QueryOutputFormat = z.infer<typeof QueryOutputFormatSchema>;

export const QueryParameterTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "json",
  "null",
]);
export type QueryParameterType = z.infer<typeof QueryParameterTypeSchema>;

export const QueryParameterSchema = z.object({
  name: z.string(),
  value: z.string(),
  type: QueryParameterTypeSchema.default("string"),
});
export type QueryParameter = z.infer<typeof QueryParameterSchema>;

export const DatabaseQueryNodeConfigSchema = z.object({
  connectionId: z.string(),
  engine: DatabaseEngineSchema.default("postgresql"),

  operation: DatabaseOperationSchema.default("execute_query"),

  query: z.string(),
  parameters: z.array(QueryParameterSchema).default([]),

  table: z.string().optional(),
  columns: z.array(z.string()).optional(),
  whereClause: z.string().optional(),
  orderBy: z.string().optional(),
  values: z.record(z.string(), z.string()).optional(),
  conflictColumn: z.string().optional(),

  timeout: z.number().positive().default(30_000),
  readOnly: z.boolean().default(true),
  maxRows: z.number().positive().default(1000),
  batchMode: QueryBatchModeSchema.default("single"),
  outputFormat: QueryOutputFormatSchema.default("rows"),
  continueOnError: z.boolean().default(false),
});

export type DatabaseQueryNodeConfig = z.infer<
  typeof DatabaseQueryNodeConfigSchema
>;

export const GraphqlMethodSchema = z.enum(["POST", "GET"]);
export type GraphqlMethod = z.infer<typeof GraphqlMethodSchema>;

export const GraphqlOperationTypeSchema = z.enum([
  "query",
  "mutation",
  "subscription",
]);
export type GraphqlOperationType = z.infer<typeof GraphqlOperationTypeSchema>;

export const GraphqlQueryNodeConfigSchema = z.object({
  endpoint: z.string(),
  method: GraphqlMethodSchema.default("POST"),
  operationType: GraphqlOperationTypeSchema.default("query"),
  query: z.string(),
  variables: z.string().default(""),
  operationName: z.string().optional(),
  headers: z.array(KeyValuePairSchema).default([]),
  auth: HttpAuthConfigSchema.default({ type: "none" }),
  timeoutMs: z.number().positive().default(30_000),
  includeExtensions: z.boolean().default(false),
  followRedirects: z.boolean().default(true),
  responsePath: z.string().optional(),
  continueOnError: z.boolean().default(false),
});

export type GraphqlQueryNodeConfig = z.infer<
  typeof GraphqlQueryNodeConfigSchema
>;
