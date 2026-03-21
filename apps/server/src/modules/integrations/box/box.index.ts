import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./box.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./box.routes";

const box = new OpenAPIHono<AuthEnv>();

box.use("/*", requireAuth);

box.openapi(startOAuthRoute, startOAuthHandler);
box.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default box;
