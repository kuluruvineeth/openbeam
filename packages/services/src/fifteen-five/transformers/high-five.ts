import type { FifteenFiveTransformContext } from "@openbeam/types/services/connectors/fifteen-five";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FifteenFiveHighFive } from "../api/high-fives";
import type { FifteenFiveUser } from "../api/users";
import {
  buildFifteenFiveUrl,
  getUserEmail,
  getUserName,
  stripHtml,
} from "./utils";

function buildHighFiveContent(
  hf: FifteenFiveHighFive,
  userLookup: Map<number, FifteenFiveUser>
): string {
  const parts: string[] = [];

  const senderName = getUserName(hf.sender, userLookup);
  const receiverName = getUserName(hf.receiver, userLookup);

  if (senderName) {
    parts.push(`From: ${senderName}`);
  }

  if (receiverName) {
    parts.push(`To: ${receiverName}`);
  }

  if (hf.text) {
    parts.push(stripHtml(hf.text));
  }

  return parts.join("\n");
}

export async function transformHighFive(
  hf: FifteenFiveHighFive,
  context: FifteenFiveTransformContext,
  userLookup: Map<number, FifteenFiveUser>
): Promise<GenericDocument> {
  const senderName = getUserName(hf.sender, userLookup);
  const receiverName = getUserName(hf.receiver, userLookup);
  const title = `High Five: ${senderName ?? `User ${hf.sender}`} → ${receiverName ?? `User ${hf.receiver}`}`;
  const content = buildHighFiveContent(hf, userLookup);
  const metadata: GenericDocument["metadata"] = {
    senderId: String(hf.sender),
    receiverId: String(hf.receiver),
    ...(senderName && { senderName }),
    ...(receiverName && { receiverName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_highfive_${hf.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(hf.id),
    document_type: "high_five",
    document_subtype: "recognition",
    title,
    content,
    created_at: new Date(hf.created).getTime(),
    updated_at: new Date(hf.created).getTime(),
    source_type: "fifteen-five",
    url: buildFifteenFiveUrl(`/high-fives/${hf.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: senderName,
    author_email: getUserEmail(hf.sender, userLookup),
  };
}
