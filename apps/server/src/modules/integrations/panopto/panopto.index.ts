import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./panopto.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./panopto.routes";

const panopto = new OpenAPIHono<AuthEnv>();

panopto.use("/*", requireAuth);

panopto.openapi(startOAuthRoute, startOAuthHandler);
panopto.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default panopto;
