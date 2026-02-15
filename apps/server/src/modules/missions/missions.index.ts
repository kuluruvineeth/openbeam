import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  broadcastMissionHandler,
  cancelMissionHandler,
  createMissionHandler,
  getMissionHandler,
  listMissionsHandler,
  pauseMissionHandler,
  resumeMissionHandler,
  spawnMissionAgentHandler,
  startMissionHandler,
  updateMissionHandler,
} from "./missions.handlers";
import {
  broadcastMissionRoute,
  cancelMissionRoute,
  createMissionRoute,
  getMissionRoute,
  listMissionsRoute,
  pauseMissionRoute,
  resumeMissionRoute,
  spawnMissionAgentRoute,
  startMissionRoute,
  updateMissionRoute,
} from "./missions.routes";

const missions = new OpenAPIHono<AuthEnv>();

missions.use("/*", requireAuth);

missions.use("/", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.MISSION_READ])(c, next);
  }
  return requireScopes([API_SCOPES.MISSION_WRITE])(c, next);
});
missions.openapi(listMissionsRoute, listMissionsHandler);
missions.openapi(createMissionRoute, createMissionHandler);

missions.use("/:id", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.MISSION_READ])(c, next);
  }
  return requireScopes([API_SCOPES.MISSION_WRITE])(c, next);
});
missions.openapi(getMissionRoute, getMissionHandler);
missions.openapi(updateMissionRoute, updateMissionHandler);

missions.use("/:id/start", requireScopes([API_SCOPES.MISSION_CONTROL]));
missions.openapi(startMissionRoute, startMissionHandler);

missions.use("/:id/pause", requireScopes([API_SCOPES.MISSION_CONTROL]));
missions.openapi(pauseMissionRoute, pauseMissionHandler);

missions.use("/:id/resume", requireScopes([API_SCOPES.MISSION_CONTROL]));
missions.openapi(resumeMissionRoute, resumeMissionHandler);

missions.use("/:id/cancel", requireScopes([API_SCOPES.MISSION_CONTROL]));
missions.openapi(cancelMissionRoute, cancelMissionHandler);

missions.use("/:id/agents/spawn", requireScopes([API_SCOPES.MISSION_CONTROL]));
missions.openapi(spawnMissionAgentRoute, spawnMissionAgentHandler);

missions.use("/:id/broadcast", requireScopes([API_SCOPES.MISSION_CONTROL]));
missions.openapi(broadcastMissionRoute, broadcastMissionHandler);

export default missions;
