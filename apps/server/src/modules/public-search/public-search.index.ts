import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { ipRateLimit } from "@/middleware/rate-limit";
import {
  publicDatasetsHandler,
  publicSearchHandler,
} from "./public-search.handlers";
import { publicDatasetsRoute, publicSearchRoute } from "./public-search.routes";

const publicSearchApp = new OpenAPIHono<AuthEnv>();

publicSearchApp.use("/*", ipRateLimit());

publicSearchApp.openapi(publicSearchRoute, publicSearchHandler);
publicSearchApp.openapi(publicDatasetsRoute, publicDatasetsHandler);

export default publicSearchApp;
