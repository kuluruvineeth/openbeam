import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  serviceAccountAuthHandler,
  startOAuthHandler,
} from "./gmail.handlers";
import {
  oauthCallbackRoute,
  serviceAccountAuthRoute,
  startOAuthRoute,
} from "./gmail.routes";

const gmail = new OpenAPIHono<AuthEnv>();

gmail.use("/*", requireAuth);

gmail.openapi(startOAuthRoute, startOAuthHandler);

gmail.openapi(oauthCallbackRoute, oauthCallbackHandler);

gmail.openapi(serviceAccountAuthRoute, serviceAccountAuthHandler);

export default gmail;
