import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext, getTeamIdFromContext } from "./memory";

export interface TeamKnowledgeServices {
  queryTeamKnowledge: (input: {
    teamId: string;
    query: string;
    categories?: string[];
    minConfidence?: number;
    limit?: number;
    excludeMissionId?: string;
  }) => Promise<{
    entries: Array<{
      id: string;
      content: string;
      category: string;
      confidence: number;
      sources: string[];
      createdByMissionId: string;
    }>;
  }>;
  storeTeamKnowledge: (input: {
    teamId: string;
    missionId: string;
    content: string;
    category: string;
    sources: string[];
    confidence: number;
  }) => Promise<{ knowledgeId: string; deduplicated: boolean }>;
}

let teamKnowledgeServices: TeamKnowledgeServices | null = null;

export function setTeamKnowledgeServices(
  services: TeamKnowledgeServices
): void {
  teamKnowledgeServices = services;
}

export const missionQueryTeamKnowledge = defineTool({
  name: "mission_query_team_knowledge",
  description:
    "Search the team-wide knowledge base for findings from all missions. Use before starting new research to avoid duplicating work.",
  category: "mission",
  parameters: z.object({
    query: z.string().describe("Search query for team knowledge"),
    categories: z
      .array(z.string())
      .optional()
      .describe("Filter by knowledge categories"),
    minConfidence: z.number().min(0).max(1).default(0.5),
    limit: z.number().int().positive().default(10),
  }),
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      entries: Array<{
        id: string;
        content: string;
        category: string;
        confidence: number;
        sources: string[];
        fromMissionId: string;
      }>;
      totalFound: number;
    }>
  > {
    if (!teamKnowledgeServices) {
      return failure(
        "INVALID_STATE",
        "Team knowledge services not initialized"
      );
    }
    const missionContext = getMissionContext(ctx);
    const teamId = getTeamIdFromContext(ctx);
    const result = await teamKnowledgeServices.queryTeamKnowledge({
      teamId,
      query: params.query,
      categories: params.categories,
      minConfidence: params.minConfidence,
      limit: params.limit,
      excludeMissionId: missionContext.missionId,
    });

    return success({
      entries: result.entries.map((entry) => ({
        id: entry.id,
        content: entry.content,
        category: entry.category,
        confidence: entry.confidence,
        sources: entry.sources,
        fromMissionId: entry.createdByMissionId,
      })),
      totalFound: result.entries.length,
    });
  },
});

export const missionStoreTeamKnowledge = defineTool({
  name: "mission_store_team_knowledge",
  description:
    "Store a research finding in the team-wide knowledge base for other missions to discover. Automatically deduplicates.",
  category: "mission",
  parameters: z.object({
    content: z.string().describe("The knowledge content to store"),
    category: z.string().describe("Knowledge category"),
    sources: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(0.7),
  }),
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{ knowledgeId: string; deduplicated: boolean }>
  > {
    if (!teamKnowledgeServices) {
      return failure(
        "INVALID_STATE",
        "Team knowledge services not initialized"
      );
    }
    const missionContext = getMissionContext(ctx);
    const teamId = getTeamIdFromContext(ctx);
    const result = await teamKnowledgeServices.storeTeamKnowledge({
      teamId,
      missionId: missionContext.missionId,
      content: params.content,
      category: params.category,
      sources: params.sources,
      confidence: params.confidence,
    });

    return success(result);
  },
});
