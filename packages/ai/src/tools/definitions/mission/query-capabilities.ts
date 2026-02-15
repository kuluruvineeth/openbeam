import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { toolRegistry } from "../../registry";
import { getMissionContext } from "./memory";
import { getMissionSpawnServices } from "./spawn-agent";

const MissionQueryCapabilitiesParametersSchema = z.object({
  capabilityFilter: z.string().optional(),
  includeAvailableTools: z.boolean().default(true),
});

export const missionQueryCapabilities = defineTool({
  name: "mission_query_capabilities",
  description:
    "Query current mission roster capabilities and available tools to decide whether spawning a specialist is necessary.",
  category: "mission",
  deferLoading: true,
  searchKeywords: [
    "capabilities",
    "agents",
    "roster",
    "tools",
    "available",
    "mission",
  ],
  allowedCallers: ["agent"],
  parameters: MissionQueryCapabilitiesParametersSchema,
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      missionAgents: Array<{
        id: string;
        name: string;
        role: string;
        level: string;
        capabilities: string[];
        tools: string[];
      }>;
      agentCount: number;
      availableTools: Array<{
        name: string;
        category: string;
        description: string;
      }>;
      availableToolCount: number;
    }>
  > {
    const services = getMissionSpawnServices();
    if (!services) {
      return failure("INVALID_STATE", "Mission spawn services not initialized");
    }

    const mCtx = getMissionContext(ctx);
    const roster = await services.getMissionAgents({
      missionId: mCtx.missionId,
    });
    const filter = params.capabilityFilter?.trim().toLowerCase();

    const missionAgents = roster.agents.filter((agent) => {
      if (!filter) {
        return true;
      }
      return (
        agent.name.toLowerCase().includes(filter) ||
        agent.role.toLowerCase().includes(filter) ||
        agent.capabilities.some((capability) =>
          capability.toLowerCase().includes(filter)
        )
      );
    });

    let availableTools: Array<{
      name: string;
      category: string;
      description: string;
    }> = [];

    if (params.includeAvailableTools) {
      const tools = toolRegistry.getAllMetadata();
      availableTools = tools
        .map((tool) => ({
          name: tool.name,
          category: tool.category,
          description: tool.description.split("\n")[0] ?? tool.description,
        }))
        .filter((tool) => {
          if (!filter) {
            return true;
          }
          return (
            tool.name.toLowerCase().includes(filter) ||
            tool.category.toLowerCase().includes(filter) ||
            tool.description.toLowerCase().includes(filter)
          );
        });
    }

    return success({
      missionAgents,
      agentCount: missionAgents.length,
      availableTools,
      availableToolCount: availableTools.length,
    });
  },
});
