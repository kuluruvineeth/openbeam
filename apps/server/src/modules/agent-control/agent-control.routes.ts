import { createRoute, z } from "@hono/zod-openapi";
import {
  CheckoutBody,
  CommentBody,
  CompleteRunBody,
  ErrorResponse,
  IssueIdParam,
  ListIssuesQuery,
  RunEventBody,
  RunIdParam,
  StatusUpdateBody,
  UpdateIssueBody,
  WakeupBody,
} from "./agent-control.schema";

const TAGS = ["Agent Control"];

const err400 = {
  description: "Bad request",
  content: { "application/json": { schema: ErrorResponse } },
};
const err401 = {
  description: "Unauthorized",
  content: { "application/json": { schema: ErrorResponse } },
};
const err404 = {
  description: "Not found",
  content: { "application/json": { schema: ErrorResponse } },
};
const err409 = {
  description: "Conflict",
  content: { "application/json": { schema: ErrorResponse } },
};

export const getIdentityRoute = createRoute({
  method: "get",
  path: "/identity",
  tags: TAGS,
  summary: "Get current agent identity",
  responses: {
    200: {
      description: "Agent identity and team context",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const updateStatusRoute = createRoute({
  method: "post",
  path: "/status",
  tags: TAGS,
  summary: "Update agent status",
  request: {
    body: {
      content: { "application/json": { schema: StatusUpdateBody } },
    },
  },
  responses: {
    200: {
      description: "Status updated",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const listIssuesRoute = createRoute({
  method: "get",
  path: "/issues",
  tags: TAGS,
  summary: "List issues assigned to agent or by filter",
  request: { query: ListIssuesQuery },
  responses: {
    200: {
      description: "Issue list",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const checkoutIssueRoute = createRoute({
  method: "post",
  path: "/issues/{issueId}/checkout",
  tags: TAGS,
  summary: "Check out an issue for the current run",
  request: {
    params: IssueIdParam,
    body: {
      content: { "application/json": { schema: CheckoutBody } },
    },
  },
  responses: {
    200: {
      description: "Issue checked out",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const releaseIssueRoute = createRoute({
  method: "post",
  path: "/issues/{issueId}/release",
  tags: TAGS,
  summary: "Release issue checkout",
  request: { params: IssueIdParam },
  responses: {
    200: {
      description: "Issue released",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const commentIssueRoute = createRoute({
  method: "post",
  path: "/issues/{issueId}/comment",
  tags: TAGS,
  summary: "Add comment to issue",
  request: {
    params: IssueIdParam,
    body: {
      content: { "application/json": { schema: CommentBody } },
    },
  },
  responses: {
    200: {
      description: "Comment added",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const updateIssueRoute = createRoute({
  method: "patch",
  path: "/issues/{issueId}",
  tags: TAGS,
  summary: "Update issue fields",
  request: {
    params: IssueIdParam,
    body: {
      content: { "application/json": { schema: UpdateIssueBody } },
    },
  },
  responses: {
    200: {
      description: "Issue updated",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const wakeupRoute = createRoute({
  method: "post",
  path: "/wakeup",
  tags: TAGS,
  summary: "Request agent wakeup",
  request: {
    body: {
      content: { "application/json": { schema: WakeupBody } },
    },
  },
  responses: {
    200: {
      description: "Wakeup enqueued",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const appendRunEventRoute = createRoute({
  method: "post",
  path: "/runs/{runId}/events",
  tags: TAGS,
  summary: "Append event to a heartbeat run",
  request: {
    params: RunIdParam,
    body: {
      content: { "application/json": { schema: RunEventBody } },
    },
  },
  responses: {
    200: {
      description: "Event appended",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});

export const completeRunRoute = createRoute({
  method: "post",
  path: "/runs/{runId}/complete",
  tags: TAGS,
  summary: "Complete a heartbeat run with result",
  request: {
    params: RunIdParam,
    body: {
      content: { "application/json": { schema: CompleteRunBody } },
    },
  },
  responses: {
    200: {
      description: "Run completed",
      content: { "application/json": { schema: z.object({}) } },
    },
    400: err400,
    401: err401,
    404: err404,
    409: err409,
  },
});
