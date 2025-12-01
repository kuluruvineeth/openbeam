import { z } from "zod";
export const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

const arrayQueryParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((val) => {
    if (!val) {
      return;
    }
    if (Array.isArray(val)) {
      return val.filter(Boolean);
    }
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  });

export const searchQuerySchema = z.object({
  q: z.string().default("").openapi({
    description: "Search query string",
    example: "project documentation",
  }),
  connector_type: arrayQueryParam.openapi({
    description:
      "Filter by connector types (comma-separated or multiple params)",
    example: "slack,notion",
  }),
  connector_id: z.string().optional().openapi({
    description: "Filter by specific connector ID",
  }),
  document_type: arrayQueryParam.openapi({
    description:
      "Filter by document types (comma-separated: message,file,page,issue,task,comment,email,document,folder,ticket)",
    example: "message,file",
  }),
  source_type: arrayQueryParam.openapi({
    description:
      "Filter by source types (comma-separated: channel,folder,database,repository,board,space)",
    example: "channel,folder",
  }),
  status: arrayQueryParam.openapi({
    description:
      "Filter by status (comma-separated: open,in_progress,done,closed,archived)",
    example: "open,in_progress",
  }),
  priority: arrayQueryParam.openapi({
    description:
      "Filter by priority (comma-separated: critical,high,medium,low,none)",
    example: "high,critical",
  }),
  label: arrayQueryParam.openapi({
    description: "Filter by labels (comma-separated)",
    example: "bug,feature",
  }),
  author_id: z.string().optional().openapi({
    description: "Filter by author ID",
  }),
  source_id: z.string().optional().openapi({
    description: "Filter by source ID (channel, folder, etc.)",
  }),
  from_date: z.coerce.number().optional().openapi({
    description: "Filter documents from this timestamp (Unix epoch ms)",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter documents until this timestamp (Unix epoch ms)",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of results",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid")
    .openapi({
      description: "Ranking algorithm to use",
    }),
});

export const searchResponseSchema = z.object({
  documents: z.array(z.any()),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  query: z.string(),
  ranking: z.string(),
});

export const autocompleteQuerySchema = z.object({
  q: z.string().min(2).openapi({
    description: "Prefix to autocomplete (minimum 2 characters)",
    example: "proj",
  }),
  limit: z.coerce.number().min(1).max(50).default(10).openapi({
    description: "Maximum number of suggestions",
  }),
});

export const autocompleteResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

export const recentQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24).openapi({
    description: "Number of hours to look back (max 7 days)",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of documents",
  }),
});

export const recentResponseSchema = z.object({
  documents: z.array(z.any()),
  count: z.number(),
});

export const threadIdParamsSchema = z.object({
  threadId: z.string().openapi({
    param: {
      name: "threadId",
      in: "path",
    },
    description: "Thread identifier",
    example: "1234567890.123456",
  }),
});

export const threadResponseSchema = z.object({
  threadId: z.string(),
  documents: z.array(z.any()),
  count: z.number(),
});

export const documentIdParamsSchema = z.object({
  documentId: z.string().openapi({
    param: {
      name: "documentId",
      in: "path",
    },
    description: "Document identifier",
  }),
});

export const similarQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10).openapi({
    description: "Maximum number of similar documents",
  }),
});

export const similarResponseSchema = z.object({
  sourceDocumentId: z.string(),
  similarDocuments: z.array(z.any()),
  count: z.number(),
});

export const authorIdParamsSchema = z.object({
  authorId: z.string().openapi({
    param: {
      name: "authorId",
      in: "path",
    },
    description: "Author identifier",
  }),
});

export const authorQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50).openapi({
    description: "Maximum number of documents",
  }),
});

export const authorResponseSchema = z.object({
  authorId: z.string(),
  documents: z.array(z.any()),
  count: z.number(),
});
