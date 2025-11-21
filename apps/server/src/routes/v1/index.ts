import { Hono } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import connectors from "./connectors";
import search from "./search";

const v1 = new Hono<AuthEnv>();

// Health Check
v1.get("/health", (c) => c.json({ status: "ok", version: "v1" }));

// API Routes
v1.route("/connectors", connectors);
v1.route("/search", search);

export default v1;
