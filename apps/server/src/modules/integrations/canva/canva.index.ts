import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./canva.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./canva.routes";

const canva = new OpenAPIHono<AuthEnv>();

canva.use("/*", requireAuth);

canva.openapi(startOAuthRoute, startOAuthHandler);
canva.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default canva;
