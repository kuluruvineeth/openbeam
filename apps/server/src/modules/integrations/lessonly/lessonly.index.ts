import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./lessonly.handlers";
import { apiKeyAuthRoute } from "./lessonly.routes";

const lessonly = new OpenAPIHono<AuthEnv>();

lessonly.use("/auth", requireAuth);
lessonly.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default lessonly;
