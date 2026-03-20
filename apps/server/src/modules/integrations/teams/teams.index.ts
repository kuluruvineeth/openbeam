import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./teams.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./teams.routes";

const teams = new OpenAPIHono<AuthEnv>();

teams.use("/*", requireAuth);

teams.openapi(startOAuthRoute, startOAuthHandler);

teams.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default teams;
