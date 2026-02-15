import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  createCanvasExecutionHandler,
  createCanvasHandler,
  deleteCanvasHandler,
  getCanvasHandler,
  listCanvasExecutionsHandler,
  listCanvasHandler,
  publishCanvasHandler,
  updateCanvasHandler,
} from "./canvas.handlers";
import {
  createCanvasExecutionRoute,
  createCanvasRoute,
  deleteCanvasRoute,
  getCanvasRoute,
  listCanvasExecutionsRoute,
  listCanvasRoute,
  publishCanvasRoute,
  updateCanvasRoute,
} from "./canvas.routes";

const canvas = new OpenAPIHono<AuthEnv>();

canvas.use("/*", requireAuth);

canvas.use("/", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.CANVAS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.CANVAS_WRITE])(c, next);
});
canvas.openapi(listCanvasRoute, listCanvasHandler);
canvas.openapi(createCanvasRoute, createCanvasHandler);

canvas.use("/:id", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.CANVAS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.CANVAS_WRITE])(c, next);
});
canvas.openapi(getCanvasRoute, getCanvasHandler);
canvas.openapi(updateCanvasRoute, updateCanvasHandler);
canvas.openapi(deleteCanvasRoute, deleteCanvasHandler);

canvas.use("/:id/publish", requireScopes([API_SCOPES.CANVAS_WRITE]));
canvas.openapi(publishCanvasRoute, publishCanvasHandler);

canvas.use("/:id/executions", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.CANVAS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.CANVAS_EXECUTE])(c, next);
});
canvas.openapi(listCanvasExecutionsRoute, listCanvasExecutionsHandler);
canvas.openapi(createCanvasExecutionRoute, createCanvasExecutionHandler);

export default canvas;
