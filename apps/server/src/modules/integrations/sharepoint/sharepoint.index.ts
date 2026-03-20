import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./sharepoint.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./sharepoint.routes";

const sharepoint = new OpenAPIHono<AuthEnv>();

sharepoint.use("/*", requireAuth);

sharepoint.openapi(startOAuthRoute, startOAuthHandler);

sharepoint.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default sharepoint;
