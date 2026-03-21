import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./zendesk.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./zendesk.routes";

const zendesk = new OpenAPIHono<AuthEnv>();

zendesk.use("/*", requireAuth);

zendesk.openapi(startOAuthRoute, startOAuthHandler);
zendesk.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default zendesk;
