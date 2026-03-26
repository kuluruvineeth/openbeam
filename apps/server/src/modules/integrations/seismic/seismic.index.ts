import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./seismic.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./seismic.routes";

const seismic = new OpenAPIHono<AuthEnv>();

seismic.use("/*", requireAuth);

seismic.openapi(startOAuthRoute, startOAuthHandler);
seismic.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default seismic;
