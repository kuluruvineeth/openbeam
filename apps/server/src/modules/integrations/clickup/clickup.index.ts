import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./clickup.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./clickup.routes";

const clickup = new OpenAPIHono<AuthEnv>();

clickup.use("/*", requireAuth);

clickup.openapi(startOAuthRoute, startOAuthHandler);

clickup.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default clickup;
