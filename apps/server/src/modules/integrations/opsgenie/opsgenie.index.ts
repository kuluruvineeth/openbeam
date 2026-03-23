import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./opsgenie.handlers";
import { apiKeyAuthRoute } from "./opsgenie.routes";

const opsgenie = new OpenAPIHono<AuthEnv>();

opsgenie.use("/auth", requireAuth);
opsgenie.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default opsgenie;
