import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./notion.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./notion.routes";

const notion = new OpenAPIHono<AuthEnv>();

notion.use("/*", requireAuth);

notion.openapi(startOAuthRoute, startOAuthHandler);

notion.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default notion;
