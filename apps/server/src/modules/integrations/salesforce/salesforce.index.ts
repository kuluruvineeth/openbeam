import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./salesforce.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./salesforce.routes";

const salesforce = new OpenAPIHono<AuthEnv>();

salesforce.use("/*", requireAuth);

salesforce.openapi(startOAuthRoute, startOAuthHandler);
salesforce.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default salesforce;
