import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./haystack.handlers";
import { apiKeyAuthRoute } from "./haystack.routes";

const haystack = new OpenAPIHono<AuthEnv>();

haystack.use("/auth", requireAuth);
haystack.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default haystack;
