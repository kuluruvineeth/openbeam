import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import analytics from "@/modules/analytics/analytics.index";
import connectors from "@/modules/connectors/connectors.index";
import search from "@/modules/search/search.index";
import webhooks from "@/modules/webhooks/webhooks.index";

const v1 = new OpenAPIHono<AuthEnv>();

v1.get("/health", (c) => c.json({ status: "ok", version: "v1" }));

v1.route("/analytics", analytics);
v1.route("/connectors", connectors);
v1.route("/search", search);
v1.route("/webhooks", webhooks);

export default v1;
