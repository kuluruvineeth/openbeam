import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./outlook.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./outlook.routes";

const outlook = new OpenAPIHono<AuthEnv>();

outlook.use("/*", requireAuth);

outlook.openapi(startOAuthRoute, startOAuthHandler);

outlook.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default outlook;
