import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./datadog.handlers";
import { apiKeyAuthRoute } from "./datadog.routes";

const datadog = new OpenAPIHono<AuthEnv>();

datadog.use("/auth", requireAuth);
datadog.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default datadog;
