import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
} from "./dynamics365.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./dynamics365.routes";

const dynamics365 = new OpenAPIHono<AuthEnv>();

dynamics365.use("/*", requireAuth);

dynamics365.openapi(startOAuthRoute, startOAuthHandler);

dynamics365.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default dynamics365;
