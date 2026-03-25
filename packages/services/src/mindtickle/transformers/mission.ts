import type { MindtickleTransformContext } from "@openbeam/types/services/connectors/mindtickle";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { MindtickleMission } from "../api/missions";
import { stripHtml } from "./utils";

function buildMissionContent(mission: MindtickleMission): string {
  const parts: string[] = [];

  if (mission.description) {
    parts.push(stripHtml(mission.description));
  }

  parts.push(`Type: ${mission.mission_type}`);
  parts.push(`Status: ${mission.status}`);

  if (mission.max_score > 0) {
    parts.push(`Max Score: ${mission.max_score}`);
    parts.push(`Passing Score: ${mission.passing_score}`);
  }

  if (mission.due_date) {
    parts.push(`Due: ${mission.due_date}`);
  }

  if (mission.tags.length > 0) {
    parts.push(`Tags: ${mission.tags.join(", ")}`);
  }

  if (mission.created_by) {
    parts.push(`Created by: ${mission.created_by.name}`);
  }

  return parts.join("\n");
}

export async function transformMission(
  mission: MindtickleMission,
  context: MindtickleTransformContext
): Promise<GenericDocument> {
  const title = mission.name;
  const content = buildMissionContent(mission);
  const metadata: GenericDocument["metadata"] = {
    missionType: mission.mission_type,
    status: mission.status,
    maxScore: String(mission.max_score),
    passingScore: String(mission.passing_score),
    ...(mission.due_date && { dueDate: mission.due_date }),
    ...(mission.tags.length > 0 && {
      tags: mission.tags.join(", "),
    }),
    ...(mission.created_by && {
      createdBy: mission.created_by.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_mission_${mission.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: mission.id,
    document_type: "mission",
    document_subtype: mission.mission_type,
    title,
    content,
    created_at: new Date(mission.created_at).getTime(),
    updated_at: new Date(mission.updated_at).getTime(),
    source_type: "mindtickle",
    url: `https://app.mindtickle.com/missions/${mission.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: mission.created_by?.name,
    author_email: mission.created_by?.email,
  };
}
