import type { FifteenFiveTransformContext } from "@openbeam/types/services/connectors/fifteen-five";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FifteenFiveObjective } from "../api/objectives";
import type { FifteenFiveUser } from "../api/users";
import { buildFifteenFiveUrl, getUserEmail, getUserName } from "./utils";

function buildObjectiveContent(
  objective: FifteenFiveObjective,
  userLookup: Map<number, FifteenFiveUser>
): string {
  const parts: string[] = [];

  if (objective.description) {
    parts.push(objective.description);
  }

  if (objective.status) {
    parts.push(`Status: ${objective.status}`);
  }

  if (objective.percentage !== null) {
    parts.push(`Progress: ${objective.percentage}%`);
  }

  const ownerName = getUserName(objective.owner, userLookup);
  if (ownerName) {
    parts.push(`Owner: ${ownerName}`);
  }

  if (objective.start_date) {
    parts.push(`Start: ${objective.start_date}`);
  }

  if (objective.end_date) {
    parts.push(`End: ${objective.end_date}`);
  }

  return parts.join("\n");
}

export async function transformObjective(
  objective: FifteenFiveObjective,
  context: FifteenFiveTransformContext,
  userLookup: Map<number, FifteenFiveUser>
): Promise<GenericDocument> {
  const title = objective.name;
  const content = buildObjectiveContent(objective, userLookup);
  const ownerName = getUserName(objective.owner, userLookup);
  const metadata: GenericDocument["metadata"] = {
    isClosed: objective.is_closed,
    ...(objective.status && { status: objective.status }),
    ...(objective.percentage !== null && {
      progress: String(objective.percentage),
    }),
    ...(objective.visibility && { visibility: objective.visibility }),
    ...(objective.start_date && { startDate: objective.start_date }),
    ...(objective.end_date && { endDate: objective.end_date }),
    ...(ownerName && { owner: ownerName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_objective_${objective.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(objective.id),
    document_type: "objective",
    document_subtype: objective.is_closed ? "closed" : "active",
    title,
    content,
    created_at: new Date(objective.created).getTime(),
    updated_at: new Date(objective.modified).getTime(),
    source_type: "fifteen-five",
    url: buildFifteenFiveUrl(`/objectives/${objective.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: ownerName,
    author_email: getUserEmail(objective.owner, userLookup),
  };
}
