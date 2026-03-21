import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./dropbox.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./dropbox.routes";

const dropbox = new OpenAPIHono<AuthEnv>();

dropbox.use("/*", requireAuth);

dropbox.openapi(startOAuthRoute, startOAuthHandler);
dropbox.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default dropbox;
