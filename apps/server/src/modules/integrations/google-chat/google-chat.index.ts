import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
} from "./google-chat.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./google-chat.routes";

const googleChat = new OpenAPIHono<AuthEnv>();

googleChat.use("/*", requireAuth);

googleChat.openapi(startOAuthRoute, startOAuthHandler);
googleChat.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default googleChat;
