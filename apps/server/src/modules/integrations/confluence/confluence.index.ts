import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./confluence.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./confluence.routes";

const confluence = new OpenAPIHono<AuthEnv>();

confluence.use("/*", requireAuth);

confluence.openapi(startOAuthRoute, startOAuthHandler);
confluence.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default confluence;
