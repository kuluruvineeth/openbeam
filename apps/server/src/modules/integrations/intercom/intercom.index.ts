import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./intercom.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./intercom.routes";

const intercom = new OpenAPIHono<AuthEnv>();

intercom.use("/*", requireAuth);

intercom.openapi(startOAuthRoute, startOAuthHandler);
intercom.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default intercom;
