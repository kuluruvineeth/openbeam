import { OpenAPIHono } from "@hono/zod-openapi";
import { paymentConfig } from "@/lib/payment-config";
import type { AuthEnv } from "@/middleware/auth";
import agentControl from "@/modules/agent-control/agent-control.index";
import analytics from "@/modules/analytics/analytics.index";
import apps from "@/modules/apps/apps.index";
import backgroundAgents from "@/modules/background-agents/background-agents.index";
import canvas from "@/modules/canvas/canvas.index";
import connectors from "@/modules/connectors/connectors.index";
import contextDb from "@/modules/context-db/context-db.index";
import customConnectors from "@/modules/custom-connectors/custom-connectors.index";
import extensions from "@/modules/extensions/extensions.index";
import feedback from "@/modules/feedback/feedback.index";
import knowledge from "@/modules/knowledge/knowledge.index";
import media from "@/modules/media/media.index";
import permissions from "@/modules/permissions/permissions.index";
import publicSearch from "@/modules/public-search/public-search.index";
import rag from "@/modules/rag/rag.index";
import research from "@/modules/research/research.index";
import search from "@/modules/search/search.index";
import teams from "@/modules/teams/teams.index";
import { voiceRoutes } from "@/modules/voice";
import webhooks from "@/modules/webhooks/webhooks.index";

const v1 = new OpenAPIHono<AuthEnv>();

v1.get("/health", (c) => c.json({ status: "ok", version: "v1" }));

v1.route("/agent-control", agentControl);
v1.route("/analytics", analytics);
v1.route("/apps", apps);
v1.route("/background-agents", backgroundAgents);
v1.route("/canvas", canvas);
v1.route("/connectors", connectors);
v1.route("/context", contextDb);
v1.route("/custom", customConnectors);
v1.route("/extensions", extensions);
v1.route("/public/feedback", feedback);
v1.route("/knowledge", knowledge);
v1.route("/media", media);
v1.route("/permissions", permissions);
v1.route("/public", publicSearch);
v1.route("/rag", rag);
v1.route("/research", research);
v1.route("/search", search);
v1.route("/teams", teams);
v1.route("/voice", voiceRoutes);
v1.route("/webhooks", webhooks);

if (paymentConfig.enabled) {
  const { default: paid } = await import("@/modules/paid/paid.index");
  v1.route("/paid", paid);
}

export default v1;
