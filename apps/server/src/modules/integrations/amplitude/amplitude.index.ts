import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./amplitude.handlers";
import { apiKeyAuthRoute } from "./amplitude.routes";

const amplitude = new OpenAPIHono<AuthEnv>();

amplitude.use("/auth", requireAuth);
amplitude.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default amplitude;
