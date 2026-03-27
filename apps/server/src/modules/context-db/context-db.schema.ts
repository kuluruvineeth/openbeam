import { z } from "@hono/zod-openapi";

export const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export const contextTypeSchema = z.enum([
  "resource",
  "memory",
  "skill",
  "tool",
]);

export const ownerTypeSchema = z.enum(["user", "agent", "team"]);

export const sessionStatusSchema = z.enum(["active", "committed", "archived"]);

export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1)
    .openapi({
      param: { name: "query", in: "query" },
      description: "Search query string",
      example: "deployment pipeline",
    }),
  context_type: contextTypeSchema.optional().openapi({
    param: { name: "context_type", in: "query" },
    description: "Filter by context type",
  }),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .default(20)
    .openapi({
      param: { name: "limit", in: "query" },
      description: "Maximum results to return",
    }),
  level: z.coerce
    .number()
    .min(0)
    .max(2)
    .default(1)
    .openapi({
      param: { name: "level", in: "query" },
      description: "Context detail level (0=abstract, 1=overview, 2=full)",
    }),
});

export const readQuerySchema = z.object({
  uri: z
    .string()
    .min(1)
    .openapi({
      param: { name: "uri", in: "query" },
      description: "Context entry URI (openbeam://...)",
      example: "openbeam://resources/team123/connectors/slack",
    }),
});

export const listQuerySchema = z.object({
  parent_uri: z
    .string()
    .min(1)
    .openapi({
      param: { name: "parent_uri", in: "query" },
      description: "Parent URI to list children of",
      example: "openbeam://user/team123/user456/memories",
    }),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .default(50)
    .openapi({
      param: { name: "limit", in: "query" },
      description: "Maximum children to return",
    }),
  offset: z.coerce
    .number()
    .min(0)
    .default(0)
    .openapi({
      param: { name: "offset", in: "query" },
      description: "Offset for pagination",
    }),
});

export const deleteEntryQuerySchema = z.object({
  uri: z
    .string()
    .min(1)
    .openapi({
      param: { name: "uri", in: "query" },
      description: "URI of the entry to delete",
    }),
});

export const createEntryBodySchema = z.object({
  uri: z.string().min(1).openapi({
    description: "Context entry URI",
    example: "openbeam://user/team123/user456/memories/preferences/dark-mode",
  }),
  parent_uri: z.string().nullable().default(null).openapi({
    description: "Parent URI for hierarchy",
  }),
  context_type: contextTypeSchema.openapi({
    description: "Type of context entry",
  }),
  category: z.string().nullable().default(null).openapi({
    description: "Category within context type",
    example: "preferences",
  }),
  is_leaf: z.boolean().default(true),
  abstract: z.string().min(1).openapi({
    description: "L0 one-sentence summary",
    example: "User prefers dark mode across all surfaces",
  }),
  overview: z.string().nullable().default(null).openapi({
    description: "L1 core info and navigation",
  }),
  content: z.string().nullable().default(null).openapi({
    description: "L2 full content",
  }),
  owner_id: z.string().min(1),
  owner_type: ownerTypeSchema,
});

export const contextEntrySchema = z.object({
  id: z.string(),
  uri: z.string(),
  parent_uri: z.string().nullable(),
  team_id: z.string(),
  owner_id: z.string(),
  owner_type: z.string(),
  context_type: z.string(),
  category: z.string().nullable(),
  is_leaf: z.boolean(),
  abstract: z.string(),
  overview: z.string().nullable(),
  content: z.string().nullable(),
  active_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const searchResponseSchema = z.object({
  results: z.array(
    contextEntrySchema.extend({
      score: z.number(),
    })
  ),
  total: z.number(),
  query: z.string(),
});

export const listResponseSchema = z.object({
  entries: z.array(contextEntrySchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    has_more: z.boolean(),
  }),
});

export const deleteResponseSchema = z.object({
  success: z.boolean(),
  uri: z.string(),
});

export const relationQuerySchema = z.object({
  uri: z
    .string()
    .min(1)
    .openapi({
      param: { name: "uri", in: "query" },
      description: "URI to get relations for",
    }),
});

export const createRelationBodySchema = z.object({
  source_uri: z.string().min(1),
  target_uri: z.string().min(1),
  reason: z.string().nullable().default(null),
});

export const deleteRelationQuerySchema = z.object({
  source_uri: z
    .string()
    .min(1)
    .openapi({
      param: { name: "source_uri", in: "query" },
      description: "Source URI of the relation",
    }),
  target_uri: z
    .string()
    .min(1)
    .openapi({
      param: { name: "target_uri", in: "query" },
      description: "Target URI of the relation",
    }),
});

export const contextRelationSchema = z.object({
  id: z.string(),
  source_uri: z.string(),
  target_uri: z.string(),
  team_id: z.string(),
  reason: z.string().nullable(),
  created_at: z.string(),
});

export const relationsResponseSchema = z.object({
  relations: z.array(contextRelationSchema),
});

export const createSessionBodySchema = z.object({
  agent_id: z.string().nullable().default(null),
});

export const sessionSchema = z.object({
  id: z.string(),
  team_id: z.string(),
  user_id: z.string(),
  agent_id: z.string().nullable(),
  total_tokens: z.number(),
  archive_count: z.number(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const sessionIdParamsSchema = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    description: "Session ID",
  }),
});

export const addMessageBodySchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string().min(1),
  parts: z.record(z.string(), z.unknown()).nullable().default(null),
});

export const sessionMessageSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  role: z.string(),
  content: z.string(),
  parts: z.record(z.string(), z.unknown()).nullable(),
  token_count: z.number(),
  created_at: z.string(),
});

export const commitResponseSchema = z.object({
  success: z.boolean(),
  session_id: z.string(),
  archive_count: z.number(),
  memories_extracted: z.number(),
});
