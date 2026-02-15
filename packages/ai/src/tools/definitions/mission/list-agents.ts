import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext } from "./memory";
import { getMissionSpawnServices } from "./spawn-agent";

export const missionListAgents = defineTool({
  name: "mission_list_agents",
  description:
    "List all agents in the current mission roster, including their roles, capabilities, and tools. Use this to discover peers before coordinating or spawning.",
  category: "mission",
  deferLoading: true,
  searchKeywords: ["list", "agents", "roster", "peers", "mission", "discover"],
  stakes: "low",
  allowedCallers: ["agent"],
  parameters: z.object({}),
  async execute(
    _params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      agents: Array<{
        id: string;
        name: string;
        role: string;
        level: string;
        capabilities: string[];
        tools: string[];
      }>;
      count: number;
    }>
  > {
    const services = getMissionSpawnServices();
    if (!services) {
      return failure("INVALID_STATE", "Mission spawn services not initialized");
    }

    const mCtx = getMissionContext(ctx);
    const result = await services.getMissionAgents({
      missionId: mCtx.missionId,
    });

    return success({
      agents: result.agents,
      count: result.agents.length,
    });
  },
});
