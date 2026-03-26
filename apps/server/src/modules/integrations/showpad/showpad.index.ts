import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./showpad.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./showpad.routes";

const showpad = new OpenAPIHono<AuthEnv>();

showpad.use("/*", requireAuth);

showpad.openapi(startOAuthRoute, startOAuthHandler);
showpad.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default showpad;
