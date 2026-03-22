import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./monday.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./monday.routes";

const monday = new OpenAPIHono<AuthEnv>();

monday.use("/*", requireAuth);

monday.openapi(startOAuthRoute, startOAuthHandler);

monday.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default monday;
