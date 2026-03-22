import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./asana.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./asana.routes";

const asana = new OpenAPIHono<AuthEnv>();

asana.use("/oauth/*", requireAuth);
asana.use("/callback", requireAuth);

asana.openapi(startOAuthRoute, startOAuthHandler);
asana.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default asana;
