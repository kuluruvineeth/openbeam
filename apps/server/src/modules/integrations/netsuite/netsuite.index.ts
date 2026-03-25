import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { authHandler } from "./netsuite.handlers";
import { authRoute } from "./netsuite.routes";

const netsuite = new OpenAPIHono<AuthEnv>();

netsuite.use("/auth", requireAuth);
netsuite.openapi(authRoute, authHandler);

export default netsuite;
