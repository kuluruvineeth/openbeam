import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./harvest.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./harvest.routes";

const harvest = new OpenAPIHono<AuthEnv>();

harvest.use("/*", requireAuth);

harvest.openapi(startOAuthRoute, startOAuthHandler);
harvest.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default harvest;
