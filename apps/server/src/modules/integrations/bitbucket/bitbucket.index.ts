import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./bitbucket.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./bitbucket.routes";

const bitbucket = new OpenAPIHono<AuthEnv>();

bitbucket.use("/*", requireAuth);

bitbucket.openapi(startOAuthRoute, startOAuthHandler);
bitbucket.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default bitbucket;
