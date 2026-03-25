import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./lucid.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./lucid.routes";

const lucid = new OpenAPIHono<AuthEnv>();

lucid.use("/*", requireAuth);

lucid.openapi(startOAuthRoute, startOAuthHandler);
lucid.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default lucid;
