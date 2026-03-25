import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./insided.handlers";
import { apiKeyAuthRoute } from "./insided.routes";

const insided = new OpenAPIHono<AuthEnv>();

insided.use("/auth", requireAuth);
insided.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default insided;
