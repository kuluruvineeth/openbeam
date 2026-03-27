import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openbeam/db";
import {
  ContextSearchService,
  ContextSessionManager,
  ContextStore,
  RelationService,
} from "@openbeam/services";
import type {
  ContextRelation,
  ContextSearchResult,
} from "@openbeam/types/context";
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

function formatEntry(entry: {
  id: string;
  uri: string;
  parentUri: string | null;
  teamId: string;
  ownerId: string;
  ownerType: string;
  contextType: string;
  category: string | null;
  isLeaf: boolean;
  abstractText: string;
  overview: string | null;
  content: string | null;
  activeCount: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    uri: entry.uri,
    parent_uri: entry.parentUri,
    team_id: entry.teamId,
    owner_id: entry.ownerId,
    owner_type: entry.ownerType,
    context_type: entry.contextType,
    category: entry.category,
    is_leaf: entry.isLeaf,
    abstract: entry.abstractText,
    overview: entry.overview,
    content: entry.content,
    active_count: entry.activeCount,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

function formatRelation(rel: {
  id: string;
  sourceUri: string;
  targetUri: string;
  teamId: string;
  reason: string | null;
  createdAt: Date;
}) {
  return {
    id: rel.id,
    source_uri: rel.sourceUri,
    target_uri: rel.targetUri,
    team_id: rel.teamId,
    reason: rel.reason,
    created_at: rel.createdAt.toISOString(),
  };
}

export const searchEntriesHandler: RouteHandler<
  typeof searchEntries,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { query, context_type, limit } = c.req.valid("query");

  const searchService = new ContextSearchService();
  const results = await searchService.find(query, teamId, {
    contextType: context_type,
    limit,
  });

  return c.json(
    {
      results: results.map((r: ContextSearchResult) => ({
        id: r.uri,
        uri: r.uri,
        parent_uri: null,
        team_id: teamId,
        owner_id: "",
        owner_type: "",
        context_type: r.contextType,
        category: r.category,
        is_leaf: true,
        abstract: r.abstractText,
        overview: null,
        content: null,
        active_count: r.activeCount,
        created_at: r.updatedAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
        score: r.score,
      })),
      total: results.length,
      query,
    },
    200
  );
};

export const readEntryHandler: RouteHandler<typeof readEntry, AuthEnv> = async (
  c
) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const query = c.req.valid("query");
  const store = new ContextStore(prisma);

  if (query.uri) {
    const entry = await store.read(teamId, query.uri);
    if (!entry) {
      return c.json({ error: "Entry not found" }, 404);
    }
    return c.json(formatEntry(entry), 200);
  }

  if (query.parent_uri) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const entries = await store.list(teamId, query.parent_uri);
    const sliced = entries.slice(offset, offset + limit);

    return c.json(
      {
        entries: sliced.map(formatEntry),
        pagination: {
          total: entries.length,
          limit,
          offset,
          has_more: offset + limit < entries.length,
        },
      },
      200
    );
  }

  return c.json({ error: "Provide either uri or parent_uri" }, 400);
};

export const createEntryHandler: RouteHandler<
  typeof createEntry,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const body = c.req.valid("json");
  const store = new ContextStore(prisma);

  const entry = await store.create({
    uri: body.uri,
    parentUri: body.parent_uri,
    teamId,
    ownerId: body.owner_id,
    ownerType: body.owner_type,
    contextType: body.context_type,
    category: body.category,
    isLeaf: body.is_leaf,
    abstractText: body.abstract,
    overview: body.overview,
    content: body.content,
  });

  return c.json(formatEntry(entry), 201);
};

export const deleteEntryHandler: RouteHandler<
  typeof deleteEntry,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { uri } = c.req.valid("query");
  const store = new ContextStore(prisma);

  const existing = await store.read(teamId, uri);
  if (!existing) {
    return c.json({ error: "Entry not found" }, 404);
  }

  await store.delete(teamId, uri);
  return c.json({ success: true, uri }, 200);
};

export const listRelationsHandler: RouteHandler<
  typeof listRelations,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { uri } = c.req.valid("query");
  const relationService = new RelationService(prisma);
  const relations = await relationService.relations(teamId, uri);

  return c.json({ relations: relations.map(formatRelation) }, 200);
};

export const createRelationHandler: RouteHandler<
  typeof createRelation,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const body = c.req.valid("json");
  const relationService = new RelationService(prisma);

  await relationService.link(
    teamId,
    body.source_uri,
    body.target_uri,
    body.reason ?? undefined
  );

  const relations = await relationService.relations(teamId, body.source_uri);
  const created = relations.find(
    (r: ContextRelation) =>
      r.sourceUri === body.source_uri && r.targetUri === body.target_uri
  );

  if (!created) {
    return c.json({ error: "Failed to create relation" }, 400);
  }

  return c.json(formatRelation(created), 201);
};

export const deleteRelationHandler: RouteHandler<
  typeof deleteRelation,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { source_uri, target_uri } = c.req.valid("query");
  const relationService = new RelationService(prisma);

  await relationService.unlink(teamId, source_uri, target_uri);
  return c.json({ success: true, uri: `${source_uri}->${target_uri}` }, 200);
};

export const createSessionHandler: RouteHandler<
  typeof createSession,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const authContext = c.get("authContext");
  const userId =
    authContext.type === "session" ? authContext.userId : "unknown";

  const body = c.req.valid("json");
  const sessionManager = new ContextSessionManager(prisma);

  const session = await sessionManager.create(
    teamId,
    userId,
    body.agent_id ?? undefined
  );

  return c.json(
    {
      id: session.id,
      team_id: session.teamId,
      user_id: session.userId,
      agent_id: session.agentId ?? null,
      total_tokens: session.totalTokens,
      archive_count: session.archiveCount,
      status: session.status,
      created_at:
        session.createdAt instanceof Date
          ? session.createdAt.toISOString()
          : String(session.createdAt),
      updated_at:
        session.updatedAt instanceof Date
          ? session.updatedAt.toISOString()
          : String(session.updatedAt),
    },
    201
  );
};

export const addMessageHandler: RouteHandler<
  typeof addMessage,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { id: sessionId } = c.req.valid("param");
  const body = c.req.valid("json");

  const sessionManager = new ContextSessionManager(prisma);
  await sessionManager.addMessage(
    sessionId,
    body.role,
    body.content,
    body.parts
  );

  const tokenCount = Math.ceil(body.content.length * 0.25);
  const now = new Date().toISOString();

  return c.json(
    {
      id: `msg_${sessionId}_${Date.now()}`,
      session_id: sessionId,
      role: body.role,
      content: body.content,
      parts: body.parts,
      token_count: tokenCount,
      created_at: now,
    },
    201
  );
};

export const commitSessionHandler: RouteHandler<
  typeof commitSession,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team context required" }, 400);
  }

  const { id: sessionId } = c.req.valid("param");
  const sessionManager = new ContextSessionManager(prisma);

  await sessionManager.commit(sessionId);

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
