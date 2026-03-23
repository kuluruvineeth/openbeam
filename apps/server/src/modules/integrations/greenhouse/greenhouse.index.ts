import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./greenhouse.handlers";
import { apiKeyAuthRoute } from "./greenhouse.routes";

const greenhouse = new OpenAPIHono<AuthEnv>();

greenhouse.use("/auth", requireAuth);
greenhouse.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default greenhouse;
