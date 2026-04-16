import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Database } from "@openbeam/db";
import {
  createExecuteAgentActivities,
  type ExecuteAgentActivities,
} from "./execute-agent";
import {
  createRunLifecycleActivities,
  type RunLifecycleActivities,
} from "./run-lifecycle";

export interface ComputerActivityDeps {
  db: Database;
  createMcpServer: (
    teamId: string,
    userId: string,
    timezone: string | null
  ) => McpServer;
}

export type ComputerActivities = ExecuteAgentActivities &
  RunLifecycleActivities;

export function createComputerActivities(
  deps: ComputerActivityDeps
): ComputerActivities {
  return {
    ...createExecuteAgentActivities(deps),
    ...createRunLifecycleActivities(deps.db),
  };
}
