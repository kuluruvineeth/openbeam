import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { authHandler } from "./marketo.handlers";
import { authRoute } from "./marketo.routes";

const marketo = new OpenAPIHono<AuthEnv>();

marketo.use("/auth", requireAuth);
marketo.openapi(authRoute, authHandler);

export default marketo;
