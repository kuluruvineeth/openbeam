import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./bynder.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./bynder.routes";

const bynder = new OpenAPIHono<AuthEnv>();

bynder.use("/*", requireAuth);

bynder.openapi(startOAuthRoute, startOAuthHandler);
bynder.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default bynder;
