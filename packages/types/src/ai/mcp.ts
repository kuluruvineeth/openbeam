import { z } from "zod";

export const MCPTransportSchema = z.enum(["stdio", "sse", "websocket"]);

export type MCPTransport = z.infer<typeof MCPTransportSchema>;

export const MCPCapabilitiesSchema = z.object({
  tools: z.boolean(),
  resources: z.boolean(),
  prompts: z.boolean(),
  logging: z.boolean().optional(),
  sampling: z.boolean().optional(),
});

export type MCPCapabilities = z.infer<typeof MCPCapabilitiesSchema>;

export const MCPServerConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  transport: MCPTransportSchema,
  capabilities: MCPCapabilitiesSchema,
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

export const MCPClientInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  protocolVersion: z.string().optional(),
});

export type MCPClientInfo = z.infer<typeof MCPClientInfoSchema>;

export const MCPToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export type MCPToolCall = z.infer<typeof MCPToolCallSchema>;

export const MCPContentTypeSchema = z.enum(["text", "image", "resource"]);

export type MCPContentType = z.infer<typeof MCPContentTypeSchema>;

export const MCPTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export type MCPTextContent = z.infer<typeof MCPTextContentSchema>;

export const MCPImageContentSchema = z.object({
  type: z.literal("image"),
  data: z.string(),
  mimeType: z.string(),
});

export type MCPImageContent = z.infer<typeof MCPImageContentSchema>;

export const MCPResourceContentSchema = z.object({
  type: z.literal("resource"),
  uri: z.string(),
  mimeType: z.string().optional(),
  text: z.string().optional(),
  blob: z.string().optional(),
});

export type MCPResourceContent = z.infer<typeof MCPResourceContentSchema>;

export const MCPContentSchema = z.discriminatedUnion("type", [
  MCPTextContentSchema,
  MCPImageContentSchema,
  MCPResourceContentSchema,
]);

export type MCPContent = z.infer<typeof MCPContentSchema>;

export const MCPToolResultSchema = z.object({
  content: z.array(MCPContentSchema),
  isError: z.boolean().optional(),
});

export type MCPToolResult = z.infer<typeof MCPToolResultSchema>;

export const MCPResourceDefinitionSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string(),
  mimeType: z.string().optional(),
});

export type MCPResourceDefinition = z.infer<typeof MCPResourceDefinitionSchema>;

export const MCPResourceTemplateSchema = z.object({
  uriTemplate: z.string(),
  name: z.string(),
  description: z.string(),
  mimeType: z.string().optional(),
});

export type MCPResourceTemplate = z.infer<typeof MCPResourceTemplateSchema>;

export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

export type MCPResource = z.infer<typeof MCPResourceSchema>;

export const MCPResourceReadResultSchema = z.object({
  contents: z.array(MCPResourceContentSchema),
});

export type MCPResourceReadResult = z.infer<typeof MCPResourceReadResultSchema>;

export const MCPPromptArgumentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

export type MCPPromptArgument = z.infer<typeof MCPPromptArgumentSchema>;

export const MCPPromptDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  arguments: z.array(MCPPromptArgumentSchema).optional(),
});

export type MCPPromptDefinition = z.infer<typeof MCPPromptDefinitionSchema>;

export const MCPPromptRoleSchema = z.enum(["user", "assistant"]);

export type MCPPromptRole = z.infer<typeof MCPPromptRoleSchema>;

export const MCPPromptMessageSchema = z.object({
  role: MCPPromptRoleSchema,
  content: MCPContentSchema,
});

export type MCPPromptMessage = z.infer<typeof MCPPromptMessageSchema>;

export const MCPPromptResultSchema = z.object({
  description: z.string().optional(),
  messages: z.array(MCPPromptMessageSchema),
});

export type MCPPromptResult = z.infer<typeof MCPPromptResultSchema>;

export const MCPRequestMethodSchema = z.enum([
  "initialize",
  "initialized",
  "ping",
  "tools/list",
  "tools/call",
  "resources/list",
  "resources/templates/list",
  "resources/read",
  "resources/subscribe",
  "resources/unsubscribe",
  "prompts/list",
  "prompts/get",
  "logging/setLevel",
  "sampling/createMessage",
]);

export type MCPRequestMethod = z.infer<typeof MCPRequestMethodSchema>;

export const MCPErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

export type MCPError = z.infer<typeof MCPErrorSchema>;

export const MCPRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: MCPRequestMethodSchema,
  params: z.unknown().optional(),
});

export type MCPRequest<T = unknown> = {
  jsonrpc: "2.0";
  id: string | number;
  method: MCPRequestMethod;
  params?: T;
};

export const MCPResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: MCPErrorSchema.optional(),
});

export type MCPResponse<T = unknown> = {
  jsonrpc: "2.0";
  id: string | number;
  result?: T;
  error?: MCPError;
};

export const MCPNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.unknown().optional(),
});

export type MCPNotification<T = unknown> = {
  jsonrpc: "2.0";
  method: string;
  params?: T;
};

export const InitializeParamsSchema = z.object({
  protocolVersion: z.string(),
  capabilities: MCPCapabilitiesSchema.partial(),
  clientInfo: MCPClientInfoSchema,
});

export type InitializeParams = z.infer<typeof InitializeParamsSchema>;

export const MCPServerInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
});

export type MCPServerInfo = z.infer<typeof MCPServerInfoSchema>;

export const InitializeResultSchema = z.object({
  protocolVersion: z.string(),
  capabilities: MCPCapabilitiesSchema,
  serverInfo: MCPServerInfoSchema,
});

export type InitializeResult = z.infer<typeof InitializeResultSchema>;

export const MCPToolListItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
});

export type MCPToolListItem = z.infer<typeof MCPToolListItemSchema>;

export const ToolsListResultSchema = z.object({
  tools: z.array(MCPToolListItemSchema),
});

export type ToolsListResult = z.infer<typeof ToolsListResultSchema>;

export const ToolsCallParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
});

export type ToolsCallParams = z.infer<typeof ToolsCallParamsSchema>;

export const ResourcesListResultSchema = z.object({
  resources: z.array(MCPResourceSchema),
  nextCursor: z.string().optional(),
});

export type ResourcesListResult = z.infer<typeof ResourcesListResultSchema>;

export const ResourcesReadParamsSchema = z.object({
  uri: z.string(),
});

export type ResourcesReadParams = z.infer<typeof ResourcesReadParamsSchema>;

export const PromptsListResultSchema = z.object({
  prompts: z.array(MCPPromptDefinitionSchema),
});

export type PromptsListResult = z.infer<typeof PromptsListResultSchema>;

export const PromptsGetParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.string()).optional(),
});

export type PromptsGetParams = z.infer<typeof PromptsGetParamsSchema>;

export const MCPServerContextSchema = z.object({
  teamId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MCPServerContext = z.infer<typeof MCPServerContextSchema>;

export const MCPServerOptionsSchema = z.object({
  name: z.string(),
  version: z.string(),
  capabilities: MCPCapabilitiesSchema.partial().optional(),
});

export type MCPServerOptions = z.infer<typeof MCPServerOptionsSchema>;
