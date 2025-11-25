/**
 * Chat/Assistants API Schemas
 * Validation schemas for AI chat and assistant operations
 */

import { z } from "zod";

// ============================================================================
// Shared Schemas
// ============================================================================

export const errorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

// ============================================================================
// Message Schemas
// ============================================================================

export const citationSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  relevanceScore: z.number(),
});

export const toolCallSchema = z.object({
  toolId: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
  result: z.unknown().optional(),
});

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  contentType: z.enum(["text", "markdown", "code"]).default("text"),
  citations: z.array(citationSchema).optional(),
  toolCalls: z.array(toolCallSchema).optional(),
  feedback: z.enum(["positive", "negative"]).nullable().optional(),
  createdAt: z.string(),
});

// ============================================================================
// Conversation Schemas
// ============================================================================

export const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  assistantId: z.string().optional(),
  assistantName: z.string().optional(),
  messageCount: z.number(),
  lastMessageAt: z.string().optional(),
  createdAt: z.string(),
});

export const conversationDetailSchema = conversationSummarySchema.extend({
  messages: z.array(messageSchema),
  summary: z.string().optional(),
});

// ============================================================================
// Assistant Schemas
// ============================================================================

export const assistantSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  visibility: z.enum(["private", "team", "public"]),
  capabilities: z.array(z.string()),
  usageCount: z.number(),
  createdAt: z.string(),
});

export const assistantDetailSchema = assistantSummarySchema.extend({
  systemPrompt: z.string(),
  personality: z.string().optional(),
  instructions: z.string().optional(),
  connectorIds: z.array(z.string()),
  documentTypes: z.array(z.string()),
  modelConfig: z.object({
    model: z.string(),
    temperature: z.number(),
    maxTokens: z.number(),
  }),
  examplePrompts: z.array(z.string()),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const listConversationsQuerySchema = z.object({
  assistant_id: z.string().optional().openapi({
    description: "Filter by assistant ID",
  }),
  limit: z.coerce.number().min(1).max(50).default(20).openapi({
    description: "Maximum number of conversations",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
});

export const conversationIdParamsSchema = z.object({
  conversationId: z.string().openapi({
    param: {
      name: "conversationId",
      in: "path",
    },
    description: "Conversation identifier",
  }),
});

export const listAssistantsQuerySchema = z.object({
  visibility: z.enum(["private", "team", "public"]).optional().openapi({
    description: "Filter by visibility",
  }),
  limit: z.coerce.number().min(1).max(50).default(20).openapi({
    description: "Maximum number of assistants",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
});

export const assistantIdParamsSchema = z.object({
  assistantId: z.string().openapi({
    param: {
      name: "assistantId",
      in: "path",
    },
    description: "Assistant identifier",
  }),
});

// ============================================================================
// Body Schemas
// ============================================================================

export const createConversationBodySchema = z.object({
  assistantId: z.string().optional().openapi({
    description: "Optional assistant ID to use",
  }),
  title: z.string().optional().openapi({
    description: "Optional conversation title",
  }),
  message: z.string().min(1).openapi({
    description: "Initial message to start the conversation",
    example: "What are the main features of our product?",
  }),
});

export const sendMessageBodySchema = z.object({
  content: z.string().min(1).openapi({
    description: "Message content",
    example: "Can you summarize the project status?",
  }),
  streamResponse: z.boolean().default(false).openapi({
    description: "Whether to stream the response (SSE)",
  }),
});

export const messageFeedbackBodySchema = z.object({
  feedback: z.enum(["positive", "negative"]).openapi({
    description: "User feedback on the message",
  }),
  comment: z.string().optional().openapi({
    description: "Optional feedback comment",
  }),
});

export const createAssistantBodySchema = z.object({
  name: z.string().min(1).max(100).openapi({
    description: "Assistant name",
    example: "Engineering Expert",
  }),
  description: z.string().max(500).optional().openapi({
    description: "Assistant description",
  }),
  systemPrompt: z.string().min(10).openapi({
    description: "System prompt that defines the assistant's behavior",
    example:
      "You are an engineering expert who helps answer technical questions.",
  }),
  personality: z.string().optional().openapi({
    description: "Personality description",
  }),
  instructions: z.string().optional().openapi({
    description: "Additional instructions",
  }),
  connectorIds: z.array(z.string()).default([]).openapi({
    description: "Restrict to specific connectors",
  }),
  documentTypes: z.array(z.string()).default([]).openapi({
    description: "Restrict to specific document types",
  }),
  modelConfig: z
    .object({
      model: z.string().default("gpt-4"),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(100).max(8192).default(4096),
    })
    .default({
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 4096,
    })
    .openapi({
      description: "Model configuration",
    }),
  examplePrompts: z.array(z.string()).default([]).openapi({
    description: "Example prompts for UI suggestions",
  }),
  visibility: z.enum(["private", "team", "public"]).default("private").openapi({
    description: "Assistant visibility",
  }),
  avatar: z.string().url().optional().openapi({
    description: "Avatar URL",
  }),
});

export const updateAssistantBodySchema = createAssistantBodySchema.partial();

// ============================================================================
// Response Schemas
// ============================================================================

export const listConversationsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(conversationSummarySchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const conversationResponseSchema = z.object({
  success: z.literal(true),
  data: conversationDetailSchema,
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const createConversationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    conversation: conversationSummarySchema,
    message: messageSchema,
    response: messageSchema,
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const sendMessageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: messageSchema,
    response: messageSchema,
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const listAssistantsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(assistantSummarySchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const assistantResponseSchema = z.object({
  success: z.literal(true),
  data: assistantDetailSchema,
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const deleteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});
