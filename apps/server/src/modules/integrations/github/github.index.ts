import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./github.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./github.routes";

const github = new OpenAPIHono<AuthEnv>();

github.use("/*", requireAuth);

github.openapi(startOAuthRoute, startOAuthHandler);
github.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default github;
