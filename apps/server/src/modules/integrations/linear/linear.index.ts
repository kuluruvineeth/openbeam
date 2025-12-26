import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./linear.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./linear.routes";

const linear = new OpenAPIHono<AuthEnv>();

linear.use("/*", requireAuth);

linear.openapi(startOAuthRoute, startOAuthHandler);

linear.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default linear;
