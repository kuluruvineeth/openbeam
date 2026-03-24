import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
} from "./google-sites.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./google-sites.routes";

const googleSites = new OpenAPIHono<AuthEnv>();

googleSites.use("/*", requireAuth);

googleSites.openapi(startOAuthRoute, startOAuthHandler);

googleSites.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default googleSites;
