import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./figma.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./figma.routes";

const figma = new OpenAPIHono<AuthEnv>();

figma.use("/oauth/*", requireAuth);
figma.use("/callback", requireAuth);

figma.openapi(startOAuthRoute, startOAuthHandler);
figma.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default figma;
