import { createRoute } from "@hono/zod-openapi";
import {
  BatchPushBodySchema,
  BatchPushResponseSchema,
  DeleteBatchBodySchema,
  DeleteBatchResponseSchema,
  DeleteSuccessResponseSchema,
  DocumentIdParamSchema,
  ErrorResponseSchema,
  PushDocumentBodySchema,
  PushSuccessResponseSchema,
  SlugParamSchema,
  StatusResponseSchema,
} from "./push.schema";

export const pushDocumentRoute = createRoute({
  method: "post",
  path: "/{slug}/documents",
  tags: ["Custom Connectors - Push API"],
  summary: "Push a single document",
  request: {
    params: SlugParamSchema,
    body: {
      content: { "application/json": { schema: PushDocumentBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Document pushed",
      content: { "application/json": { schema: PushSuccessResponseSchema } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limited",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const batchPushRoute = createRoute({
  method: "post",
  path: "/{slug}/documents/batch",
  tags: ["Custom Connectors - Push API"],
  summary: "Push documents in batch (max 100)",
  request: {
    params: SlugParamSchema,
    body: {
      content: { "application/json": { schema: BatchPushBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Batch push results",
      content: { "application/json": { schema: BatchPushResponseSchema } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limited",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const deleteDocumentRoute = createRoute({
  method: "delete",
  path: "/{slug}/documents/{documentId}",
  tags: ["Custom Connectors - Push API"],
  summary: "Delete a single document",
  request: {
    params: DocumentIdParamSchema,
  },
  responses: {
    200: {
      description: "Document deleted",
      content: { "application/json": { schema: DeleteSuccessResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const batchDeleteRoute = createRoute({
  method: "post",
  path: "/{slug}/documents/delete",
  tags: ["Custom Connectors - Push API"],
  summary: "Delete documents in batch (max 100)",
  request: {
    params: SlugParamSchema,
    body: {
      content: { "application/json": { schema: DeleteBatchBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Batch delete results",
      content: { "application/json": { schema: DeleteBatchResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const statusRoute = createRoute({
  method: "get",
  path: "/{slug}/status",
  tags: ["Custom Connectors - Push API"],
  summary: "Get connector status and stats",
  request: {
    params: SlugParamSchema,
  },
  responses: {
    200: {
      description: "Connector status",
      content: { "application/json": { schema: StatusResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});
