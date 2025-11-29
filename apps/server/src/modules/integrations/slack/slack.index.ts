import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./slack.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./slack.routes";

const slack = new OpenAPIHono<AuthEnv>();

slack.use("/*", requireAuth);

slack.openapi(startOAuthRoute, startOAuthHandler);

slack.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default slack;
