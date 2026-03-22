import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./hubspot.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./hubspot.routes";

const hubspot = new OpenAPIHono<AuthEnv>();

hubspot.use("/*", requireAuth);

hubspot.openapi(startOAuthRoute, startOAuthHandler);
hubspot.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default hubspot;
