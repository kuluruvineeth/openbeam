import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./jira.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./jira.routes";

const jira = new OpenAPIHono<AuthEnv>();

jira.use("/*", requireAuth);

jira.openapi(startOAuthRoute, startOAuthHandler);
jira.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default jira;
