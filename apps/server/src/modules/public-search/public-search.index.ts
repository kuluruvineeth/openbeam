import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { ipRateLimit } from "@/middleware/rate-limit";
import {
  publicDatasetsHandler,
  publicDocumentHandler,
  publicOverviewHandler,
  publicSearchHandler,
} from "./public-search.handlers";
import {
  publicDatasetsRoute,
  publicDocumentRoute,
  publicOverviewRoute,
  publicSearchRoute,
} from "./public-search.routes";

const publicSearchApp = new OpenAPIHono<AuthEnv>();

publicSearchApp.use("/*", ipRateLimit());

publicSearchApp.openapi(publicSearchRoute, publicSearchHandler);

publicSearchApp.use(
  "/overview",
  ipRateLimit({
    burstLimit: 10,
    burstWindow: 30,
    minuteLimit: 30,
    minuteWindow: 300,
  })
);
publicSearchApp.openapi(publicOverviewRoute, publicOverviewHandler);

publicSearchApp.openapi(publicDocumentRoute, publicDocumentHandler);
publicSearchApp.openapi(publicDatasetsRoute, publicDatasetsHandler);

export default publicSearchApp;
