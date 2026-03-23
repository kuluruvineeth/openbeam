import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./airtable.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./airtable.routes";

const airtable = new OpenAPIHono<AuthEnv>();

airtable.use("/*", requireAuth);

airtable.openapi(startOAuthRoute, startOAuthHandler);
airtable.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default airtable;
