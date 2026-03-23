import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./onenote.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./onenote.routes";

const onenote = new OpenAPIHono<AuthEnv>();

onenote.use("/*", requireAuth);

onenote.openapi(startOAuthRoute, startOAuthHandler);

onenote.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default onenote;
