import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./gong.handlers";
import { apiKeyAuthRoute } from "./gong.routes";

const gong = new OpenAPIHono<AuthEnv>();

gong.use("/auth", requireAuth);
gong.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default gong;
