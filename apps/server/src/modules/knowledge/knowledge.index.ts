import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  getEntityHandler,
  getExpertiseHandler,
  getExpertsHandler,
  getKnowledgePanelHandler,
  getRelationsHandler,
  listEntitiesHandler,
  searchEntitiesHandler,
} from "./knowledge.handlers";
import {
  getEntityRoute,
  getExpertiseRoute,
  getExpertsRoute,
  getKnowledgePanelRoute,
  getRelationsRoute,
  listEntitiesRoute,
  searchEntitiesRoute,
} from "./knowledge.routes";

const knowledge = new OpenAPIHono<AuthEnv>();

knowledge.use("/*", requireAuth);
knowledge.use("/*", requireScopes([API_SCOPES.KNOWLEDGE_READ]));

knowledge.openapi(listEntitiesRoute, listEntitiesHandler);
knowledge.openapi(searchEntitiesRoute, searchEntitiesHandler);
knowledge.openapi(getEntityRoute, getEntityHandler);
knowledge.openapi(getRelationsRoute, getRelationsHandler);
knowledge.openapi(getKnowledgePanelRoute, getKnowledgePanelHandler);
knowledge.openapi(getExpertsRoute, getExpertsHandler);
knowledge.openapi(getExpertiseRoute, getExpertiseHandler);

export default knowledge;
