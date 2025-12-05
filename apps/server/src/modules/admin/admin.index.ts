import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { setupBullBoard } from "./admin.handlers";

const admin = new OpenAPIHono<AuthEnv>();

const serverAdapter = setupBullBoard();
admin.route("/queues", serverAdapter.registerPlugin());

export default admin;
