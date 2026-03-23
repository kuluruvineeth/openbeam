import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
} from "./azure-devops.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./azure-devops.routes";

const azureDevOps = new OpenAPIHono<AuthEnv>();

azureDevOps.use("/oauth/*", requireAuth);
azureDevOps.use("/callback", requireAuth);

azureDevOps.openapi(startOAuthRoute, startOAuthHandler);
azureDevOps.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default azureDevOps;
