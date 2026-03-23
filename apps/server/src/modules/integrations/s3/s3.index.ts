import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./s3.handlers";
import { apiKeyAuthRoute } from "./s3.routes";

const s3 = new OpenAPIHono<AuthEnv>();

s3.use("/auth", requireAuth);
s3.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default s3;
