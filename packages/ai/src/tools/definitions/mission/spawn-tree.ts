import type { ToolExecutionResult } from "@openplane/types/ai";
import type { SpawnRegistryEntry } from "@openplane/types/temporal/mission";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext } from "./memory";
import { getMissionSpawnServices } from "./spawn-agent";

export const missionGetSpawnTree = defineTool({
  name: "mission_get_spawn_tree",
  description:
    "Retrieve the spawn lineage tree for the current mission. Returns a flat list of spawned agents with parent references and spawn depth.",
  category: "mission",
  deferLoading: true,
  searchKeywords: [
    "spawn",
    "tree",
    "lineage",
    "hierarchy",
    "parent",
    "children",
  ],
  stakes: "low",
  allowedCallers: ["agent"],
  parameters: z.object({}),
  async execute(
    _params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      entries: SpawnRegistryEntry[];
      count: number;
    }>
  > {
    const services = getMissionSpawnServices();
    if (!services) {
      return failure("INVALID_STATE", "Mission spawn services not initialized");
    }

    const mCtx = getMissionContext(ctx);
    const result = await services.getSpawnTree({
      missionId: mCtx.missionId,
    });

    return success({
      entries: result.entries,
      count: result.entries.length,
    });
  },
});
