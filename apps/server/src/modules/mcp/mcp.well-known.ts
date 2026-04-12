import { Hono } from "hono";
import { cors } from "hono/cors";

const API_URL = process.env.OPENBEAM_API_URL || "https://api.openbeam.work";
const APP_URL = process.env.OPENBEAM_APP_URL || "https://app.openbeam.work";

const wellKnown = new Hono();

wellKnown.use("/*", cors({ origin: "*" }));

wellKnown.get("/.well-known/mcp.json", (c) =>
  c.json({
    name: "openbeam",
    description:
      "Enterprise search and AI assistant — 100+ connectors, knowledge graph, AI agents",
    url: `${API_URL}/mcp`,
    auth: {
      type: "bearer",
      instructions: `Create an API key at ${APP_URL}/settings/api-keys`,
    },
    capabilities: ["tools", "resources", "prompts"],
  })
);

export default wellKnown;
