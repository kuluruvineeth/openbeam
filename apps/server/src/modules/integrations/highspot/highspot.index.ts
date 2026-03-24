import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./highspot.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./highspot.routes";

const highspot = new OpenAPIHono<AuthEnv>();

highspot.use("/*", requireAuth);

highspot.openapi(startOAuthRoute, startOAuthHandler);
highspot.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default highspot;
