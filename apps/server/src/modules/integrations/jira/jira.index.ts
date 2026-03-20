import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
  webhookHandler,
} from "./jira.handlers";
import {
  oauthCallbackRoute,
  startOAuthRoute,
  webhookRoute,
} from "./jira.routes";

const jira = new OpenAPIHono<AuthEnv>();

jira.use("/oauth/*", requireAuth);
jira.use("/callback", requireAuth);

jira.openapi(startOAuthRoute, startOAuthHandler);
jira.openapi(oauthCallbackRoute, oauthCallbackHandler);
jira.openapi(webhookRoute, webhookHandler);

export default jira;
