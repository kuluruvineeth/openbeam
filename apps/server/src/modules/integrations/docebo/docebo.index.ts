import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { authHandler } from "./docebo.handlers";
import { authRoute } from "./docebo.routes";

const docebo = new OpenAPIHono<AuthEnv>();

docebo.use("/auth", requireAuth);
docebo.openapi(authRoute, authHandler);

export default docebo;
