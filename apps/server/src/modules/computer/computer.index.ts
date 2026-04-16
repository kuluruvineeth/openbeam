import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  approveRunHandler,
  confirmAgentHandler,
  deleteAgentHandler,
  enableAgentHandler,
  generateAgentHandler,
  getCatalogHandler,
  listAgentsHandler,
  listMemoryHandler,
  listRunsHandler,
  rejectRunHandler,
  triggerRunHandler,
} from "./computer.handlers";
import {
  approveRunRoute,
  confirmAgentRoute,
  deleteAgentRoute,
  enableAgentRoute,
  generateAgentRoute,
  getCatalogRoute,
  listAgentsRoute,
  listMemoryRoute,
  listRunsRoute,
  rejectRunRoute,
  triggerRunRoute,
} from "./computer.routes";

const computer = new OpenAPIHono<AuthEnv>();

computer.use("/*", requireAuth);

computer.use("/catalog", requireScopes([API_SCOPES.COMPUTER_READ]));
computer.openapi(getCatalogRoute, getCatalogHandler);

computer.use("/agents", requireScopes([API_SCOPES.COMPUTER_READ]));
computer.openapi(listAgentsRoute, listAgentsHandler);

computer.use("/agents", requireScopes([API_SCOPES.COMPUTER_WRITE]));
computer.openapi(enableAgentRoute, enableAgentHandler);

computer.use("/agents/:agentId", requireScopes([API_SCOPES.COMPUTER_WRITE]));
computer.openapi(deleteAgentRoute, deleteAgentHandler);

computer.use(
  "/agents/:agentId/run",
  requireScopes([API_SCOPES.COMPUTER_WRITE])
);
computer.openapi(triggerRunRoute, triggerRunHandler);

computer.use(
  "/agents/:agentId/runs",
  requireScopes([API_SCOPES.COMPUTER_READ])
);
computer.openapi(listRunsRoute, listRunsHandler);

computer.use(
  "/agents/:agentId/runs/:runId/approve",
  requireScopes([API_SCOPES.COMPUTER_WRITE])
);
computer.openapi(approveRunRoute, approveRunHandler);

computer.use(
  "/agents/:agentId/runs/:runId/reject",
  requireScopes([API_SCOPES.COMPUTER_WRITE])
);
computer.openapi(rejectRunRoute, rejectRunHandler);

computer.use(
  "/agents/:agentId/memory",
  requireScopes([API_SCOPES.COMPUTER_READ])
);
computer.openapi(listMemoryRoute, listMemoryHandler);

computer.use("/generate", requireScopes([API_SCOPES.COMPUTER_WRITE]));
computer.openapi(generateAgentRoute, generateAgentHandler);

computer.use("/agents/confirm", requireScopes([API_SCOPES.COMPUTER_WRITE]));
computer.openapi(confirmAgentRoute, confirmAgentHandler);

export default computer;
