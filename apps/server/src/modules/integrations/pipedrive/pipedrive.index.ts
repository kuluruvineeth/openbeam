import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./pipedrive.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./pipedrive.routes";

const pipedrive = new OpenAPIHono<AuthEnv>();

pipedrive.use("/*", requireAuth);

pipedrive.openapi(startOAuthRoute, startOAuthHandler);
pipedrive.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default pipedrive;
