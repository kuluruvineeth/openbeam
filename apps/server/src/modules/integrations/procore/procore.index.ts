import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./procore.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./procore.routes";

const procore = new OpenAPIHono<AuthEnv>();

procore.use("/*", requireAuth);

procore.openapi(startOAuthRoute, startOAuthHandler);
procore.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default procore;
