import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./mindtickle.handlers";
import { apiKeyAuthRoute } from "./mindtickle.routes";

const mindtickle = new OpenAPIHono<AuthEnv>();

mindtickle.use("/auth", requireAuth);
mindtickle.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default mindtickle;
