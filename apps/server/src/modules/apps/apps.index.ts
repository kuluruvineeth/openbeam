import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  createConnectorHandler,
  deleteConnectorHandler,
  getConnectorHandler,
  listConnectorResourcesHandler,
  listConnectorsHandler,
  updateConnectorHandler,
  updateConnectorResourceHandler,
} from "./apps.handlers";
import {
  createConnectorRoute,
  deleteConnectorRoute,
  getConnectorRoute,
  listConnectorResourcesRoute,
  listConnectorsRoute,
  updateConnectorResourceRoute,
  updateConnectorRoute,
} from "./apps.routes";

const apps = new OpenAPIHono<AuthEnv>();

apps.use("/*", requireAuth);

apps.use("/connectors", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.APPS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.APPS_WRITE])(c, next);
});
apps.openapi(listConnectorsRoute, listConnectorsHandler);
apps.openapi(createConnectorRoute, createConnectorHandler);

apps.use("/connectors/:id", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.APPS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.APPS_WRITE])(c, next);
});
apps.openapi(getConnectorRoute, getConnectorHandler);
apps.openapi(updateConnectorRoute, updateConnectorHandler);
apps.openapi(deleteConnectorRoute, deleteConnectorHandler);

apps.use("/connectors/:id/resources", requireScopes([API_SCOPES.APPS_READ]));
apps.openapi(listConnectorResourcesRoute, listConnectorResourcesHandler);

apps.use(
  "/connectors/resources/:resourceId",
  requireScopes([API_SCOPES.APPS_WRITE])
);
apps.openapi(updateConnectorResourceRoute, updateConnectorResourceHandler);

export default apps;
