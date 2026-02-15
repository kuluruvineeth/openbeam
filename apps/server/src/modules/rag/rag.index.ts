import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  askHandler,
  createConversationHandler,
  deleteConversationHandler,
  getConversationHandler,
  listConversationsHandler,
  streamHandler,
} from "./rag.handlers";
import {
  askRoute,
  createConversationRoute,
  deleteConversationRoute,
  getConversationRoute,
  listConversationsRoute,
  streamRoute,
} from "./rag.routes";

const rag = new OpenAPIHono<AuthEnv>();

rag.use("/*", requireAuth);

rag.use("/ask", requireScopes([API_SCOPES.RAG_WRITE]));
rag.openapi(askRoute, askHandler);

rag.use("/stream", requireScopes([API_SCOPES.RAG_WRITE]));
rag.openapi(streamRoute, streamHandler);

rag.use("/conversations", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.RAG_READ])(c, next);
  }
  return requireScopes([API_SCOPES.RAG_WRITE])(c, next);
});
rag.openapi(createConversationRoute, createConversationHandler);
rag.openapi(listConversationsRoute, listConversationsHandler);

rag.use("/conversations/:id", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.RAG_READ])(c, next);
  }
  return requireScopes([API_SCOPES.RAG_WRITE])(c, next);
});
rag.openapi(getConversationRoute, getConversationHandler);
rag.openapi(deleteConversationRoute, deleteConversationHandler);

export default rag;
