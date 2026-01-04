import { z } from "@hono/zod-openapi";

export const errorSchema = z.object({
  error: z.string(),
  code: z.number().optional(),
  message: z.string().optional(),
});

export const toolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
});

export const toolsListResponseSchema = z.object({
  tools: z.array(toolSchema),
});

export const toolCallParamsSchema = z.object({
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

export const toolNameParamsSchema = z.object({
  name: z.string().describe("The name of the tool to call"),
});

export const mcpContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    data: z.string(),
    mimeType: z.string(),
  }),
  z.object({
    type: z.literal("resource"),
    uri: z.string(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
    blob: z.string().optional(),
  }),
]);

export const toolCallResponseSchema = z.object({
  content: z.array(mcpContentSchema),
  isError: z.boolean().optional(),
});

export const resourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

export const resourcesListResponseSchema = z.object({
  resources: z.array(resourceSchema),
  nextCursor: z.string().optional(),
});

export const resourceUriParamsSchema = z.object({
  uri: z.string().describe("The URI of the resource to read"),
});

export const resourceContentSchema = z.object({
  type: z.literal("resource"),
  uri: z.string(),
  mimeType: z.string().optional(),
  text: z.string().optional(),
  blob: z.string().optional(),
});

export const resourceReadResponseSchema = z.object({
  contents: z.array(resourceContentSchema),
});

export const promptArgumentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

export const promptDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  arguments: z.array(promptArgumentSchema).optional(),
});

export const promptsListResponseSchema = z.object({
  prompts: z.array(promptDefinitionSchema),
});

export const promptNameParamsSchema = z.object({
  name: z.string().describe("The name of the prompt to get"),
});

export const promptArgsQuerySchema = z.object({
  args: z.string().optional().describe("JSON-encoded prompt arguments"),
});

export const promptMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: mcpContentSchema,
});

export const promptGetResponseSchema = z.object({
  description: z.string().optional(),
  messages: z.array(promptMessageSchema),
});
