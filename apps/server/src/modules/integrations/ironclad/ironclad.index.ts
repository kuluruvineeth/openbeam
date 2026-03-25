import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./ironclad.handlers";
import { apiKeyAuthRoute } from "./ironclad.routes";

const ironclad = new OpenAPIHono<AuthEnv>();

ironclad.use("/auth", requireAuth);
ironclad.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default ironclad;
