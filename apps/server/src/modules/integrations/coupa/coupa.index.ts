import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { authHandler } from "./coupa.handlers";
import { authRoute } from "./coupa.routes";

const coupa = new OpenAPIHono<AuthEnv>();

coupa.use("/auth", requireAuth);
coupa.openapi(authRoute, authHandler);

export default coupa;
