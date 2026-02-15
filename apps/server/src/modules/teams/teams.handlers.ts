import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openplane/db";
import {
  createTeamApiKeyForActor,
  listTeamApiKeysForActor,
  revokeTeamApiKeyForActor,
  type TeamApiKeyActor,
  TeamApiKeyError,
} from "@openplane/services/api-keys";
import {
  createTeamForActor,
  getTeamRoleForActor,
  listTeamsForActor,
  switchTeamForActor,
  type TeamActor,
  TeamServiceError,
} from "@openplane/services/teams";
import type { AuthEnv } from "@/middleware/auth";
import type {
  createTeamApiKeyRoute,
  createTeamRoute,
  getTeamRoleRoute,
  listTeamApiKeysRoute,
  listTeamsRoute,
  revokeTeamApiKeyRoute,
  switchTeamRoute,
} from "./teams.routes";

export const listTeamsHandler: RouteHandler<
  typeof listTeamsRoute,
  AuthEnv
> = async (c) => {
  const actor = toTeamActor(c.get("authContext"));
  try {
    const teams = await listTeamsForActor(prisma, actor);
    return c.json({ teams }, 200);
  } catch (error) {
    if (error instanceof TeamServiceError) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json({ error: "Unauthorized" }, 401);
  }
};

export const createTeamHandler: RouteHandler<
  typeof createTeamRoute,
  AuthEnv
> = async (c) => {
  const actor = toTeamActor(c.get("authContext"));
  const input = c.req.valid("json");
  try {
    const team = await createTeamForActor(prisma, {
      actor,
      name: input.name,
      slug: input.slug,
    });
    return c.json(team, 200);
  } catch (error: unknown) {
    if (error instanceof TeamServiceError) {
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      if (error.code === "FORBIDDEN") {
        return c.json({ error: error.message }, 403);
      }
      if (error.code === "CONFLICT") {
        return c.json({ error: error.message }, 409);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Team creation failed" }, 400);
  }
};

export const switchTeamHandler: RouteHandler<
  typeof switchTeamRoute,
  AuthEnv
> = async (c) => {
  const actor = toTeamActor(c.get("authContext"));
  const { id: teamId } = c.req.valid("param");
  try {
    await switchTeamForActor(prisma, { actor, teamId });
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    if (error instanceof TeamServiceError) {
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: error.message }, 403);
    }
    return c.json({ error: "User is not a member of this team" }, 403);
  }
};

export const getTeamRoleHandler: RouteHandler<
  typeof getTeamRoleRoute,
  AuthEnv
> = async (c) => {
  const actor = toTeamActor(c.get("authContext"));
  const { id: teamId } = c.req.valid("param");
  try {
    const role = await getTeamRoleForActor(prisma, { actor, teamId });
    return c.json({ role }, 200);
  } catch (error: unknown) {
    if (error instanceof TeamServiceError) {
      if (error.code === "UNAUTHORIZED") {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: "Membership not found" }, 404);
    }
    return c.json({ error: "Membership not found" }, 404);
  }
};

function toTeamActor(
  authContext: AuthEnv["Variables"]["authContext"]
): TeamActor {
  if (authContext.type === "session") {
    return { type: "session", userId: authContext.userId };
  }
  if (authContext.type === "apiKey") {
    return { type: "apiKey", teamId: authContext.teamId };
  }
  return { type: "none" };
}

function toTeamApiKeyActor(
  authContext: AuthEnv["Variables"]["authContext"]
): TeamApiKeyActor {
  if (authContext.type === "session") {
    return { type: "session", userId: authContext.userId };
  }
  if (authContext.type === "apiKey") {
    return { type: "apiKey", teamId: authContext.teamId };
  }
  return { type: "none" };
}

function teamApiKeyErrorResponse(error: unknown): {
  status: 401 | 403 | 404 | 500;
  error: string;
} {
  if (!(error instanceof TeamApiKeyError)) {
    return { status: 500, error: "Failed to process team API key request" };
  }
  if (error.code === "UNAUTHORIZED") {
    return { status: 401, error: error.message };
  }
  if (error.code === "FORBIDDEN") {
    return { status: 403, error: error.message };
  }
  if (error.code === "NOT_FOUND") {
    return { status: 404, error: error.message };
  }
  return { status: 500, error: "Failed to process team API key request" };
}

export const listTeamApiKeysHandler: RouteHandler<
  typeof listTeamApiKeysRoute,
  AuthEnv
> = async (c) => {
  const authContext = c.get("authContext");
  const actor = toTeamApiKeyActor(authContext);
  const { id: teamId } = c.req.valid("param");
  try {
    const apiKeys = await listTeamApiKeysForActor(prisma, { actor, teamId });
    return c.json({ apiKeys }, 200);
  } catch (error) {
    const response = teamApiKeyErrorResponse(error);
    return c.json({ error: response.error }, response.status);
  }
};

export const createTeamApiKeyHandler: RouteHandler<
  typeof createTeamApiKeyRoute,
  AuthEnv
> = async (c) => {
  const authContext = c.get("authContext");
  const actor = toTeamApiKeyActor(authContext);
  const { id: teamId } = c.req.valid("param");
  const input = c.req.valid("json");
  try {
    const created = await createTeamApiKeyForActor(prisma, {
      actor,
      teamId,
      name: input.name,
      scopes: input.scopes,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    return c.json(created, 201);
  } catch (error) {
    const response = teamApiKeyErrorResponse(error);
    return c.json({ error: response.error }, response.status);
  }
};

export const revokeTeamApiKeyHandler: RouteHandler<
  typeof revokeTeamApiKeyRoute,
  AuthEnv
> = async (c) => {
  const authContext = c.get("authContext");
  const actor = toTeamApiKeyActor(authContext);
  const { id: teamId, keyId } = c.req.valid("param");
  try {
    await revokeTeamApiKeyForActor(prisma, {
      actor,
      teamId,
      apiKeyId: keyId,
    });
    return c.json({ success: true }, 200);
  } catch (error) {
    const response = teamApiKeyErrorResponse(error);
    return c.json({ error: response.error }, response.status);
  }
};
