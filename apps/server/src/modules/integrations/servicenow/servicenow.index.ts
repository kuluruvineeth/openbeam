import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./servicenow.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./servicenow.routes";

const servicenow = new OpenAPIHono<AuthEnv>();

servicenow.use("/*", requireAuth);

servicenow.openapi(startOAuthRoute, startOAuthHandler);
servicenow.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default servicenow;
