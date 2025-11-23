import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./slack.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./slack.routes";

const slack = new OpenAPIHono<AuthEnv>();

// Apply Auth Middleware globally
slack.use("/*", requireAuth);

// Start OAuth
slack.openapi(startOAuthRoute, startOAuthHandler);

// OAuth Callback
slack.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default slack;
