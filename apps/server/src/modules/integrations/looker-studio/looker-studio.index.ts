import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
} from "./looker-studio.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./looker-studio.routes";

const lookerStudio = new OpenAPIHono<AuthEnv>();

lookerStudio.use("/*", requireAuth);

lookerStudio.openapi(startOAuthRoute, startOAuthHandler);

lookerStudio.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default lookerStudio;
