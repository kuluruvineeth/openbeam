import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./miro.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./miro.routes";

const miro = new OpenAPIHono<AuthEnv>();

miro.use("/*", requireAuth);

miro.openapi(startOAuthRoute, startOAuthHandler);
miro.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default miro;
