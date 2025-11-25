/**
 * API Keys Management Handlers
 * Request handlers for API key operations
 */

import type { RouteHandler } from "@hono/zod-openapi";
import * as response from "@/lib/response";
import { type AuthEnv, getTeamId } from "@/middleware/auth";
import type {
  createApiKey,
  deleteApiKey,
  getApiKey,
  getApiKeyUsage,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
} from "./api-keys.routes";
import { apiKeysService } from "./api-keys.service";

// ============================================================================
// Handlers
// ============================================================================

export const listApiKeysHandler: RouteHandler<
  typeof listApiKeys,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const { keys, total } = await apiKeysService.listApiKeys(teamId, {
    type: query.type,
    activeOnly: query.active_only,
    limit: query.limit,
    offset: query.offset,
  });

  const page = Math.floor(query.offset / query.limit) + 1;

  return response.paginated(c, keys, {
    page,
    pageSize: query.limit,
    total,
  });
};

export const createApiKeyHandler: RouteHandler<
  typeof createApiKey,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const result = await apiKeysService.createApiKey(teamId, userId, {
    name: body.name,
    description: body.description,
    type: body.type,
    scopes: body.scopes,
    expiresIn: body.expiresIn,
    allowedIps: body.allowedIps,
    allowedDomains: body.allowedDomains,
    rateLimit: body.rateLimit,
  });

  return response.success(c, result, 201);
};

export const getApiKeyHandler: RouteHandler<typeof getApiKey, AuthEnv> = async (
  c
) => {
  const { keyId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const key = await apiKeysService.getApiKey(keyId, teamId);

  if (!key) {
    return response.notFound(c, "API key", keyId);
  }

  return response.success(c, key);
};

export const updateApiKeyHandler: RouteHandler<
  typeof updateApiKey,
  AuthEnv
> = async (c) => {
  const { keyId } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const key = await apiKeysService.updateApiKey(keyId, teamId, body);

  if (!key) {
    return response.notFound(c, "API key", keyId);
  }

  return response.success(c, key);
};

export const revokeApiKeyHandler: RouteHandler<
  typeof revokeApiKey,
  AuthEnv
> = async (c) => {
  const { keyId } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const revoked = await apiKeysService.revokeApiKey(
    keyId,
    teamId,
    userId,
    body.reason
  );

  if (!revoked) {
    return response.notFound(c, "API key", keyId);
  }

  return response.success(c, { message: "API key revoked successfully" });
};

export const deleteApiKeyHandler: RouteHandler<
  typeof deleteApiKey,
  AuthEnv
> = async (c) => {
  const { keyId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const deleted = await apiKeysService.deleteApiKey(keyId, teamId);

  if (!deleted) {
    return response.notFound(c, "API key", keyId);
  }

  return response.success(c, { message: "API key deleted successfully" });
};

export const getApiKeyUsageHandler: RouteHandler<
  typeof getApiKeyUsage,
  AuthEnv
> = async (c) => {
  const { keyId } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const usage = await apiKeysService.getApiKeyUsage(
    keyId,
    teamId,
    query.period
  );

  if (!usage) {
    return response.notFound(c, "API key", keyId);
  }

  return response.success(c, {
    keyId,
    period: query.period,
    ...usage,
  });
};

export const rotateApiKeyHandler: RouteHandler<
  typeof rotateApiKey,
  AuthEnv
> = async (c) => {
  const { keyId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const result = await apiKeysService.rotateApiKey(keyId, teamId);

  if (!result) {
    return response.notFound(c, "API key", keyId);
  }

  return response.success(c, result);
};
