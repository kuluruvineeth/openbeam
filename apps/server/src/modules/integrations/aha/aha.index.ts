import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./aha.handlers";
import { apiKeyAuthRoute } from "./aha.routes";

const aha = new OpenAPIHono<AuthEnv>();

aha.use("/auth", requireAuth);
aha.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default aha;
