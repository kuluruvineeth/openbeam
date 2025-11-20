import { Hono } from "hono";
import type { AuthEnv } from "../../middleware/auth";

const v1 = new Hono<AuthEnv>();

// Health Check
v1.get("/health", (c) => c.json({ status: "ok", version: "v1" }));

// Placeholder for future Public API routes
// v1.route("/search", searchRouter);
// v1.route("/connectors", connectorsRouter);

export default v1;
