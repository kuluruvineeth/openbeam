import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { executeAgentHandler, streamAgentHandler } from "./agent.handlers";

const agent = new Hono<AuthEnv>();

agent.use("/*", requireAuth);

agent.post("/execute", executeAgentHandler);
agent.post("/stream", streamAgentHandler);

export default agent;
