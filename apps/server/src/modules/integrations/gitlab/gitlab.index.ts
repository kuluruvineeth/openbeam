import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./gitlab.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./gitlab.routes";

const gitlab = new OpenAPIHono<AuthEnv>();

gitlab.use("/*", requireAuth);

gitlab.openapi(startOAuthRoute, startOAuthHandler);
gitlab.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default gitlab;
