import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./smartsheet.handlers";
import { apiKeyAuthRoute } from "./smartsheet.routes";

const smartsheet = new OpenAPIHono<AuthEnv>();

smartsheet.use("/auth", requireAuth);
smartsheet.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default smartsheet;
