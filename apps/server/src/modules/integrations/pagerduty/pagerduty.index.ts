import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./pagerduty.handlers";
import { apiKeyAuthRoute } from "./pagerduty.routes";

const pagerduty = new OpenAPIHono<AuthEnv>();

pagerduty.use("/auth", requireAuth);
pagerduty.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default pagerduty;
