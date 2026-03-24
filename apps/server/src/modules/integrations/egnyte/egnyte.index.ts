import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./egnyte.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./egnyte.routes";

const egnyte = new OpenAPIHono<AuthEnv>();

egnyte.use("/*", requireAuth);

egnyte.openapi(startOAuthRoute, startOAuthHandler);
egnyte.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default egnyte;
