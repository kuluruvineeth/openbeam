import type { NiceCxoneTransformContext } from "@openbeam/types/services/connectors/nice-cxone";
import type { GenericDocument } from "@openbeam/vespa";
import type { CxoneTeam } from "../api/teams";
import { buildCxoneUrl } from "./utils";

export function transformCxoneTeam(
  team: CxoneTeam,
  context: NiceCxoneTransformContext
): GenericDocument {
  const parts = [
    team.description ?? null,
    team.isActive ? "Status: Active" : "Status: Inactive",
    team.teamLeadName ? `Lead: ${team.teamLeadName}` : null,
    team.inViewAgentCount !== undefined
      ? `Agents: ${team.inViewAgentCount}`
      : null,
    team.notes ?? null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_team_${team.teamId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(team.teamId),
    document_type: "team",
    document_subtype: team.isActive ? "active" : "inactive",
    title: team.teamName,
    content: parts.join(" — "),
    created_at: team.lastUpdateTime
      ? new Date(team.lastUpdateTime).getTime()
      : Date.now(),
    updated_at: team.lastUpdateTime
      ? new Date(team.lastUpdateTime).getTime()
      : Date.now(),
    url: buildCxoneUrl(context.baseUrl, "teams", team.teamId),
    author_name: team.teamLeadName,
    is_public: false,
    access_control: [],
    metadata: {
      isActive: String(team.isActive),
      ...(team.teamLeadName && { teamLead: team.teamLeadName }),
      ...(team.inViewAgentCount !== undefined && {
        agentCount: String(team.inViewAgentCount),
      }),
    },
  };
}
