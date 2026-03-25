import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./phabricator.handlers";
import { apiKeyAuthRoute } from "./phabricator.routes";

const phabricator = new OpenAPIHono<AuthEnv>();

phabricator.use("/auth", requireAuth);
phabricator.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default phabricator;
