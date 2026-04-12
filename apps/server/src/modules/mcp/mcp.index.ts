import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  callToolHandler,
  getPromptHandler,
  listPromptsHandler,
  listResourcesHandler,
  listToolsHandler,
  readResourceHandler,
} from "./mcp.handlers";
import wellKnown from "./mcp.well-known";

const mcp = new Hono<AuthEnv>();

mcp.route("/", wellKnown);
mcp.use("/*", requireAuth);

mcp.get("/tools", listToolsHandler);
mcp.post("/tools/:name/call", callToolHandler);
mcp.get("/resources", listResourcesHandler);
mcp.get("/resources/:uri", readResourceHandler);
mcp.get("/prompts", listPromptsHandler);
mcp.get("/prompts/:name", getPromptHandler);

export default mcp;
