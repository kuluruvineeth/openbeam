import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./guru.handlers";
import { apiKeyAuthRoute } from "./guru.routes";

const guru = new OpenAPIHono<AuthEnv>();

guru.use("/auth", requireAuth);
guru.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default guru;
