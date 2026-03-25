import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./interact.handlers";
import { apiKeyAuthRoute } from "./interact.routes";

const interact = new OpenAPIHono<AuthEnv>();

interact.use("/auth", requireAuth);
interact.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default interact;
