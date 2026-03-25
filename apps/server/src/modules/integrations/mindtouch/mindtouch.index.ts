import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./mindtouch.handlers";
import { apiKeyAuthRoute } from "./mindtouch.routes";

const mindtouch = new OpenAPIHono<AuthEnv>();

mindtouch.use("/auth", requireAuth);
mindtouch.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default mindtouch;
