import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./loopio.handlers";
import { apiKeyAuthRoute } from "./loopio.routes";

const loopio = new OpenAPIHono<AuthEnv>();

loopio.use("/auth", requireAuth);
loopio.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default loopio;
