import type { NiceCxoneTransformContext } from "@openbeam/types/services/connectors/nice-cxone";
import type { GenericDocument } from "@openbeam/vespa";
import type { CxoneSkill } from "../api/skills";
import { buildCxoneUrl } from "./utils";

export function transformCxoneSkill(
  skill: CxoneSkill,
  context: NiceCxoneTransformContext
): GenericDocument {
  const parts = [
    skill.mediaTypeName ? `Media: ${skill.mediaTypeName}` : null,
    skill.campaignName ? `Campaign: ${skill.campaignName}` : null,
    skill.isActive ? "Status: Active" : "Status: Inactive",
    skill.isOutbound ? "Outbound" : "Inbound",
    skill.serviceLevelGoal !== undefined
      ? `SL Goal: ${skill.serviceLevelGoal}%`
      : null,
    skill.agentCount !== undefined ? `Agents: ${skill.agentCount}` : null,
    skill.notes ?? null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_skill_${skill.skillId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(skill.skillId),
    document_type: "skill",
    document_subtype: skill.mediaTypeName,
    title: skill.skillName,
    content: parts.join(" — "),
    created_at: skill.lastUpdateTime
      ? new Date(skill.lastUpdateTime).getTime()
      : Date.now(),
    updated_at: skill.lastUpdateTime
      ? new Date(skill.lastUpdateTime).getTime()
      : Date.now(),
    url: buildCxoneUrl(context.baseUrl, "skills", skill.skillId),
    is_public: false,
    access_control: [],
    metadata: {
      ...(skill.mediaTypeName && { mediaType: skill.mediaTypeName }),
      ...(skill.campaignName && { campaignName: skill.campaignName }),
      isActive: String(skill.isActive),
      ...(skill.agentCount !== undefined && {
        agentCount: String(skill.agentCount),
      }),
    },
  };
}
