import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { authHandler } from "./nice-cxone.handlers";
import { authRoute } from "./nice-cxone.routes";

const niceCxone = new OpenAPIHono<AuthEnv>();

niceCxone.use("/auth", requireAuth);
niceCxone.openapi(authRoute, authHandler);

export default niceCxone;
