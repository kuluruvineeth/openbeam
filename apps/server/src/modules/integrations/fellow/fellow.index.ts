import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./fellow.handlers";
import { apiKeyAuthRoute } from "./fellow.routes";

const fellow = new OpenAPIHono<AuthEnv>();

fellow.use("/auth", requireAuth);
fellow.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default fellow;
