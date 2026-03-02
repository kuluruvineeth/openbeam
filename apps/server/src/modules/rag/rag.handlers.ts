import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openplane/db";
import {
  askRAGForActor,
  createRAGConversationForActor,
  deleteRAGConversationForActor,
  getRAGConversationForActor,
  listRAGConversationsForActor,
  RAGServiceError,
  streamRAGForActor,
} from "@openplane/services/rag-api";
import { streamSSE } from "hono/streaming";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  askRoute,
  createConversationRoute,
  deleteConversationRoute,
  getConversationRoute,
  listConversationsRoute,
  streamRoute,
} from "./rag.routes";

export const askHandler: RouteHandler<typeof askRoute, AuthEnv> = async (c) => {
  const input = c.req.valid("json");

  try {
    const response = await askRAGForActor(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      query: input.query,
      conversationId: input.conversationId,
      modelId: input.modelId,
      temperature: input.temperature,
      includeMedia: input.includeMedia,
      sourceId: input.sourceId,
    });

    return c.json(response, 200);
  } catch (error) {
    if (error instanceof RAGServiceError && error.code === "UNAUTHORIZED") {
      return c.json({ error: error.message }, 401);
    }
    throw error;
  }
};

export const streamHandler: RouteHandler<typeof streamRoute, AuthEnv> = async (
  c
) => {
  const input = c.req.valid("json");

  let stream: Awaited<ReturnType<typeof streamRAGForActor>>;
  try {
    stream = await streamRAGForActor(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      query: input.query,
      conversationId: input.conversationId,
      modelId: input.modelId,
      temperature: input.temperature,
      includeMedia: input.includeMedia,
      sourceId: input.sourceId,
    });
  } catch (error) {
    if (error instanceof RAGServiceError && error.code === "UNAUTHORIZED") {
      return c.json({ error: error.message }, 401);
    }
    throw error;
  }

  return streamSSE(c, async (sseStream) => {
    try {
      for await (const chunk of stream) {
        await sseStream.writeSSE({
          data: JSON.stringify(chunk),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "stream failed";
      await sseStream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: message }),
      });
    }
  });
};

export const createConversationHandler: RouteHandler<
  typeof createConversationRoute,
  AuthEnv
> = async (c) => {
  try {
    const response = await createRAGConversationForActor(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
    });

    return c.json(response, 200);
  } catch (error) {
    if (error instanceof RAGServiceError && error.code === "UNAUTHORIZED") {
      return c.json({ error: error.message }, 401);
    }
    throw error;
  }
};

export const listConversationsHandler: RouteHandler<
  typeof listConversationsRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("query");

  try {
    const response = await listRAGConversationsForActor(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    });

    return c.json(response, 200);
  } catch (error) {
    if (error instanceof RAGServiceError && error.code === "UNAUTHORIZED") {
      return c.json({ error: error.message }, 401);
    }
    throw error;
  }
};

export const getConversationHandler: RouteHandler<
  typeof getConversationRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const response = await getRAGConversationForActor(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      conversationId: id,
    });

    return c.json(response, 200);
  } catch (error) {
    if (error instanceof RAGServiceError) {
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
    }
    throw error;
  }
};

export const deleteConversationHandler: RouteHandler<
  typeof deleteConversationRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    await deleteRAGConversationForActor(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      conversationId: id,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof RAGServiceError) {
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
    }
    throw error;
  }
};
