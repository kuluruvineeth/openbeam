import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { systemHealthHandler } from "./health.handlers";

const health = new OpenAPIHono<AuthEnv>();

health.get("/system", systemHealthHandler);

export default health;
