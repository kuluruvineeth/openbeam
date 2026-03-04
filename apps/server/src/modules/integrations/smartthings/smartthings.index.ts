import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./smartthings.handlers";
import { apiKeyAuthRoute } from "./smartthings.routes";

const smartthings = new OpenAPIHono<AuthEnv>();

smartthings.use("/auth", requireAuth);
smartthings.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default smartthings;
