import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  createTeamApiKeyHandler,
  createTeamHandler,
  getTeamRoleHandler,
  listTeamApiKeysHandler,
  listTeamsHandler,
  revokeTeamApiKeyHandler,
  switchTeamHandler,
} from "./teams.handlers";
import {
  createTeamApiKeyRoute,
  createTeamRoute,
  getTeamRoleRoute,
  listTeamApiKeysRoute,
  listTeamsRoute,
  revokeTeamApiKeyRoute,
  switchTeamRoute,
} from "./teams.routes";

const teams = new OpenAPIHono<AuthEnv>();

teams.use("/*", requireAuth);

teams.use("/", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.TEAMS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.TEAMS_WRITE])(c, next);
});
teams.openapi(listTeamsRoute, listTeamsHandler);
teams.openapi(createTeamRoute, createTeamHandler);

teams.use("/:id/switch", requireScopes([API_SCOPES.TEAMS_WRITE]));
teams.openapi(switchTeamRoute, switchTeamHandler);

teams.use("/:id/role", requireScopes([API_SCOPES.TEAMS_READ]));
teams.openapi(getTeamRoleRoute, getTeamRoleHandler);

teams.use("/:id/api-keys", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.TEAMS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.TEAMS_WRITE])(c, next);
});
teams.use("/:id/api-keys/*", requireScopes([API_SCOPES.TEAMS_WRITE]));
teams.openapi(listTeamApiKeysRoute, listTeamApiKeysHandler);
teams.openapi(createTeamApiKeyRoute, createTeamApiKeyHandler);
teams.openapi(revokeTeamApiKeyRoute, revokeTeamApiKeyHandler);

export default teams;
