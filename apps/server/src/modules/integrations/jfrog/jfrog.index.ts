import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./jfrog.handlers";
import { apiKeyAuthRoute } from "./jfrog.routes";

const jfrog = new OpenAPIHono<AuthEnv>();

jfrog.use("/auth", requireAuth);
jfrog.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default jfrog;
