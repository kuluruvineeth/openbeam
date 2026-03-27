import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  addMessageHandler,
  commitSessionHandler,
  createEntryHandler,
  createRelationHandler,
  createSessionHandler,
  deleteEntryHandler,
  deleteRelationHandler,
  listRelationsHandler,
  readEntryHandler,
  searchEntriesHandler,
} from "./context-db.handlers";
import {
  addMessage,
  commitSession,
  createEntry,
  createRelation,
  createSession,
  deleteEntry,
  deleteRelation,
  listRelations,
  readEntry,
  searchEntries,
} from "./context-db.routes";

const contextDb = new OpenAPIHono<AuthEnv>();

contextDb.use("/*", requireAuth);

contextDb.use("/search", requireScopes([API_SCOPES.CONTEXT_READ]));
contextDb.openapi(searchEntries, searchEntriesHandler);

contextDb.use("/entries", requireScopes([API_SCOPES.CONTEXT_READ]));
contextDb.openapi(readEntry, readEntryHandler);

contextDb.use("/entries", requireScopes([API_SCOPES.CONTEXT_WRITE]));
contextDb.openapi(createEntry, createEntryHandler);

contextDb.use("/entries", requireScopes([API_SCOPES.CONTEXT_WRITE]));
contextDb.openapi(deleteEntry, deleteEntryHandler);

contextDb.use("/relations", requireScopes([API_SCOPES.CONTEXT_READ]));
contextDb.openapi(listRelations, listRelationsHandler);

contextDb.use("/relations", requireScopes([API_SCOPES.CONTEXT_WRITE]));
contextDb.openapi(createRelation, createRelationHandler);

contextDb.use("/relations", requireScopes([API_SCOPES.CONTEXT_WRITE]));
contextDb.openapi(deleteRelation, deleteRelationHandler);

contextDb.use("/sessions", requireScopes([API_SCOPES.CONTEXT_WRITE]));
contextDb.openapi(createSession, createSessionHandler);

contextDb.use(
  "/sessions/:id/messages",
  requireScopes([API_SCOPES.CONTEXT_WRITE])
);
contextDb.openapi(addMessage, addMessageHandler);

contextDb.use(
  "/sessions/:id/commit",
  requireScopes([API_SCOPES.CONTEXT_WRITE])
);
contextDb.openapi(commitSession, commitSessionHandler);

export default contextDb;
