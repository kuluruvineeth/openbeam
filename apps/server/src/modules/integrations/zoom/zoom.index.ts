import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./zoom.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./zoom.routes";

const zoom = new OpenAPIHono<AuthEnv>();

zoom.use("/*", requireAuth);

zoom.openapi(startOAuthRoute, startOAuthHandler);
zoom.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default zoom;
