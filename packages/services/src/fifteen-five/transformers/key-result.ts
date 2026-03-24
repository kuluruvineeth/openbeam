import type { FifteenFiveTransformContext } from "@openbeam/types/services/connectors/fifteen-five";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FifteenFiveKeyResult } from "../api/key-results";
import type { FifteenFiveUser } from "../api/users";
import { buildFifteenFiveUrl, getUserEmail, getUserName } from "./utils";

function buildKeyResultContent(
  kr: FifteenFiveKeyResult,
  userLookup: Map<number, FifteenFiveUser>
): string {
  const parts: string[] = [];

  if (kr.description) {
    parts.push(kr.description);
  }

  if (kr.status) {
    parts.push(`Status: ${kr.status}`);
  }

  if (kr.target_value !== null) {
    parts.push(`Target: ${kr.target_value}`);
  }

  if (kr.current_value !== null) {
    parts.push(`Current: ${kr.current_value}`);
  }

  if (
    kr.target_value !== null &&
    kr.current_value !== null &&
    kr.target_value > 0
  ) {
    const pct = Math.round((kr.current_value / kr.target_value) * 100);
    parts.push(`Progress: ${pct}%`);
  }

  const ownerName = getUserName(kr.owner, userLookup);
  if (ownerName) {
    parts.push(`Owner: ${ownerName}`);
  }

  return parts.join("\n");
}

export async function transformKeyResult(
  kr: FifteenFiveKeyResult,
  context: FifteenFiveTransformContext,
  userLookup: Map<number, FifteenFiveUser>
): Promise<GenericDocument> {
  const title = kr.name;
  const content = buildKeyResultContent(kr, userLookup);
  const ownerName = getUserName(kr.owner, userLookup);
  const metadata: GenericDocument["metadata"] = {
    objectiveId: String(kr.objective),
    isClosed: kr.is_closed,
    ...(kr.status && { status: kr.status }),
    ...(kr.target_value !== null && { targetValue: String(kr.target_value) }),
    ...(kr.current_value !== null && {
      currentValue: String(kr.current_value),
    }),
    ...(ownerName && { owner: ownerName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_keyresult_${kr.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(kr.id),
    document_type: "key_result",
    document_subtype: kr.is_closed ? "closed" : "active",
    title,
    content,
    created_at: new Date(kr.created).getTime(),
    updated_at: new Date(kr.modified).getTime(),
    source_type: "fifteen-five",
    url: buildFifteenFiveUrl(`/objectives/key-results/${kr.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: ownerName,
    author_email: getUserEmail(kr.owner, userLookup),
  };
}
