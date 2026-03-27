import { createRoute } from "@hono/zod-openapi";
import {
  addMessageBodySchema,
  commitResponseSchema,
  contextEntrySchema,
  contextRelationSchema,
  createEntryBodySchema,
  createRelationBodySchema,
  createSessionBodySchema,
  deleteEntryQuerySchema,
  deleteRelationQuerySchema,
  deleteResponseSchema,
  errorSchema,
  listQuerySchema,
  listResponseSchema,
  readQuerySchema,
  relationQuerySchema,
  relationsResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  sessionIdParamsSchema,
  sessionMessageSchema,
  sessionSchema,
} from "./context-db.schema";

const tags = ["Context DB"];

export const searchEntries = createRoute({
  tags,
  method: "get",
  path: "/search",
  summary: "Search context entries",
  description:
    "Search across context entries using hierarchical retrieval with L0/L1/L2 tiered loading",
  request: {
    query: searchQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: searchResponseSchema } },
      description: "Search results",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const readEntry = createRoute({
  tags,
  method: "get",
  path: "/entries",
  summary: "Read or list context entries",
  description:
    "Read a single entry by URI or list children by parent_uri. Provide exactly one query parameter.",
  request: {
    query: readQuerySchema
      .merge(listQuerySchema.partial())
      .partial()
      .refine((q) => q.uri || q.parent_uri, {
        message: "Provide either uri or parent_uri",
      }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: contextEntrySchema.or(listResponseSchema),
        },
      },
      description: "Entry or list of children",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Entry not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const createEntry = createRoute({
  tags,
  method: "post",
  path: "/entries",
  summary: "Create a context entry",
  description: "Store a new context entry in the openbeam:// namespace",
  request: {
    body: {
      content: {
        "application/json": { schema: createEntryBodySchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: contextEntrySchema } },
      description: "Entry created",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Entry already exists",
    },
  },
});

export const deleteEntry = createRoute({
  tags,
  method: "delete",
  path: "/entries",
  summary: "Delete a context entry",
  description: "Remove a context entry by URI",
  request: {
    query: deleteEntryQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Entry deleted",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Entry not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const listRelations = createRoute({
  tags,
  method: "get",
  path: "/relations",
  summary: "List relations for a URI",
  description: "Get all relations where the URI is source or target",
  request: {
    query: relationQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: relationsResponseSchema } },
      description: "Relations list",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const createRelation = createRoute({
  tags,
  method: "post",
  path: "/relations",
  summary: "Create a relation between entries",
  description: "Link two context entries with an optional reason",
  request: {
    body: {
      content: {
        "application/json": { schema: createRelationBodySchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: contextRelationSchema } },
      description: "Relation created",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Relation already exists",
    },
  },
});

export const deleteRelation = createRoute({
  tags,
  method: "delete",
  path: "/relations",
  summary: "Delete a relation",
  description: "Remove a relation between two context entries",
  request: {
    query: deleteRelationQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Relation deleted",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Relation not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const createSession = createRoute({
  tags,
  method: "post",
  path: "/sessions",
  summary: "Create a context session",
  description: "Start a new session for accumulating context and messages",
  request: {
    body: {
      content: {
        "application/json": { schema: createSessionBodySchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: sessionSchema } },
      description: "Session created",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const addMessage = createRoute({
  tags,
  method: "post",
  path: "/sessions/{id}/messages",
  summary: "Add a message to a session",
  description: "Append a message to an active session",
  request: {
    params: sessionIdParamsSchema,
    body: {
      content: {
        "application/json": { schema: addMessageBodySchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: sessionMessageSchema } },
      description: "Message added",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Session not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const commitSession = createRoute({
  tags,
  method: "post",
  path: "/sessions/{id}/commit",
  summary: "Commit a session",
  description:
    "Archive messages, extract memories, and transition session to committed state",
  request: {
    params: sessionIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: commitResponseSchema } },
      description: "Session committed",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Session not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});
