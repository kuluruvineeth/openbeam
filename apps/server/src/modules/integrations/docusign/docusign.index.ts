import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { oauthCallbackHandler, startOAuthHandler } from "./docusign.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./docusign.routes";

const docusign = new OpenAPIHono<AuthEnv>();

docusign.use("/*", requireAuth);

docusign.openapi(startOAuthRoute, startOAuthHandler);
docusign.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default docusign;
