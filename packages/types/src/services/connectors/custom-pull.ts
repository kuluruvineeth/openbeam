import { z } from "zod";

export const PullAuthTypeSchema = z.enum([
  "api_key",
  "bearer",
  "basic",
  "oauth2",
  "custom_headers",
]);

export type PullAuthType = z.infer<typeof PullAuthTypeSchema>;

export const PullAuthConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("api_key"),
    headerName: z.string().min(1).max(256).optional(),
    queryParamName: z.string().min(1).max(256).optional(),
    value: z.string().min(1).max(4096),
  }),
  z.object({
    type: z.literal("bearer"),
    token: z.string().min(1).max(4096),
  }),
  z.object({
    type: z.literal("basic"),
    username: z.string().min(1).max(512),
    password: z.string().max(4096),
  }),
  z.object({
    type: z.literal("oauth2"),
    connectorId: z.string().min(1),
  }),
  z.object({
    type: z.literal("custom_headers"),
    headers: z.record(z.string(), z.string().max(4096)),
  }),
]);

export type PullAuthConfig = z.infer<typeof PullAuthConfigSchema>;

export const PaginationStrategySchema = z.enum([
  "cursor",
  "offset",
  "page_number",
  "link_header",
  "none",
]);

export type PaginationStrategy = z.infer<typeof PaginationStrategySchema>;

export const PaginationConfigSchema = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("cursor"),
    cursorParam: z.string().min(1).max(256),
    cursorPath: z.string().min(1).max(512),
    limitParam: z.string().min(1).max(256).optional(),
    limitValue: z.number().int().min(1).max(10_000).optional(),
  }),
  z.object({
    strategy: z.literal("offset"),
    offsetParam: z.string().min(1).max(256),
    limitParam: z.string().min(1).max(256),
    limitValue: z.number().int().min(1).max(10_000),
    totalPath: z.string().min(1).max(512).optional(),
  }),
  z.object({
    strategy: z.literal("page_number"),
    pageParam: z.string().min(1).max(256),
    perPageParam: z.string().min(1).max(256).optional(),
    perPageValue: z.number().int().min(1).max(10_000).optional(),
    totalPagesPath: z.string().min(1).max(512).optional(),
    totalItemsPath: z.string().min(1).max(512).optional(),
    startPage: z.number().int().min(0).max(1).default(1),
  }),
  z.object({
    strategy: z.literal("link_header"),
    limitParam: z.string().min(1).max(256).optional(),
    limitValue: z.number().int().min(1).max(10_000).optional(),
  }),
  z.object({
    strategy: z.literal("none"),
  }),
]);

export type PaginationConfig = z.infer<typeof PaginationConfigSchema>;

export const FieldMappingEntrySchema = z.object({
  sourcePath: z.string().min(1).max(512),
  targetField: z.string().min(1).max(256),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  transform: z
    .enum(["string", "number", "boolean", "timestamp", "strip_html", "join"])
    .optional(),
});

export type FieldMappingEntry = z.infer<typeof FieldMappingEntrySchema>;

export const EndpointDefinitionSchema = z.object({
  id: z.string().min(1).max(128),
  path: z.string().min(1).max(2048),
  method: z.enum(["GET", "POST"]).default("GET"),
  headers: z.record(z.string(), z.string().max(4096)).optional(),
  queryParams: z.record(z.string(), z.string().max(4096)).optional(),
  bodyTemplate: z.string().max(65_536).optional(),
  itemsPath: z.string().min(1).max(512),
  documentType: z.string().min(1).max(100),
  documentSubtype: z.string().max(100).optional(),
  pagination: PaginationConfigSchema,
  fieldMappings: z.array(FieldMappingEntrySchema).min(1),
  contentFields: z.array(z.string().max(512)).optional(),
  contentTemplate: z.string().max(10_000).optional(),
  urlTemplate: z.string().max(2048).optional(),
  incrementalField: z.string().max(512).optional(),
  incrementalParam: z.string().max(256).optional(),
  rateLimitRequestsPerSecond: z.number().min(0.1).max(1000).optional(),
});

export type EndpointDefinition = z.infer<typeof EndpointDefinitionSchema>;

export const PullConnectorDefinitionSchema = z.object({
  baseUrl: z.string().url().max(2048),
  auth: PullAuthConfigSchema,
  endpoints: z.array(EndpointDefinitionSchema).min(1).max(50),
  globalHeaders: z.record(z.string(), z.string().max(4096)).optional(),
  defaultBatchSize: z.number().int().min(1).max(10_000).default(100),
  requestTimeoutMs: z.number().int().min(1000).max(300_000).default(30_000),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryBaseDelayMs: z.number().int().min(100).max(30_000).default(1000),
});

export type PullConnectorDefinition = z.infer<
  typeof PullConnectorDefinitionSchema
>;

export const CustomPullSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  endpointCursors: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional(),
});

export type CustomPullSyncCursor = z.infer<typeof CustomPullSyncCursorSchema>;

export interface CustomPullTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  slug: string;
}
