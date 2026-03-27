import type { RouteHandler } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
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

export const searchEntriesHandler: RouteHandler<
  typeof searchEntries,
  AuthEnv
> = (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { query } = c.req.valid("query");

  return c.json(
    {
      results: [],
      total: 0,
      query,
    },
    200
  );
};

// @ts-expect-error TS2589: RouteHandler instantiation is excessively deep on this generated route schema.
export const readEntryHandler: RouteHandler<typeof readEntry, AuthEnv> = (
  c
) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const query = c.req.valid("query");

  if (query.uri) {
    return c.json({ error: "Entry not found" }, 404);
  }

  if (query.parent_uri) {
    return c.json(
      {
        entries: [],
        pagination: {
          total: 0,
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
          has_more: false,
        },
      },
      200
    );
  }

  return c.json({ error: "Provide either uri or parent_uri" }, 400);
};

export const createEntryHandler: RouteHandler<typeof createEntry, AuthEnv> = (
  c
) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const body = c.req.valid("json");

  const id = `ctx_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();

  return c.json(
    {
      id,
      uri: body.uri,
      parent_uri: body.parent_uri,
      team_id: teamId,
      owner_id: body.owner_id,
      owner_type: body.owner_type,
      context_type: body.context_type,
      category: body.category,
      is_leaf: body.is_leaf,
      abstract: body.abstract,
      overview: body.overview,
      content: body.content,
      active_count: 0,
      created_at: now,
      updated_at: now,
    },
    201
  );
};

export const deleteEntryHandler: RouteHandler<typeof deleteEntry, AuthEnv> = (
  c
) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { uri } = c.req.valid("query");

  return c.json({ success: true, uri }, 200);
};

export const listRelationsHandler: RouteHandler<
  typeof listRelations,
  AuthEnv
> = (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  c.req.valid("query");

  return c.json({ relations: [] }, 200);
};

export const createRelationHandler: RouteHandler<
  typeof createRelation,
  AuthEnv
> = (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const body = c.req.valid("json");

  const id = `rel_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();

  return c.json(
    {
      id,
      source_uri: body.source_uri,
      target_uri: body.target_uri,
      team_id: teamId,
      reason: body.reason,
      created_at: now,
    },
    201
  );
};

export const deleteRelationHandler: RouteHandler<
  typeof deleteRelation,
  AuthEnv
> = (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { source_uri, target_uri } = c.req.valid("query");

  return c.json({ success: true, uri: `${source_uri}->${target_uri}` }, 200);
};

export const createSessionHandler: RouteHandler<
  typeof createSession,
  AuthEnv
> = (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const authContext = c.get("authContext");
  const userId =
    authContext.type === "session" ? authContext.userId : "unknown";

  const body = c.req.valid("json");

  const id = `sess_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();

  return c.json(
    {
      id,
      team_id: teamId,
      user_id: userId,
      agent_id: body.agent_id,
      total_tokens: 0,
      archive_count: 0,
      status: "active",
      created_at: now,
      updated_at: now,
    },
    201
  );
};

export const addMessageHandler: RouteHandler<typeof addMessage, AuthEnv> = (
  c
) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { id: sessionId } = c.req.valid("param");
  const body = c.req.valid("json");

  const messageId = `msg_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();

  return c.json(
    {
      id: messageId,
      session_id: sessionId,
      role: body.role,
      content: body.content,
      parts: body.parts,
      token_count: Math.ceil(body.content.length / 4),
      created_at: now,
    },
    201
  );
};

export const commitSessionHandler: RouteHandler<
  typeof commitSession,
  AuthEnv
> = (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { id: sessionId } = c.req.valid("param");

  return c.json(
    {
      success: true,
      session_id: sessionId,
      archive_count: 0,
      memories_extracted: 0,
    },
    200
  );
};
