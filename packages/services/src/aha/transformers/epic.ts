import type { AhaTransformContext } from "@openbeam/types/services/connectors/aha";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AhaEpic } from "../api/epics";
import { stripHtml } from "./utils";

function buildEpicContent(epic: AhaEpic): string {
  const parts: string[] = [];

  if (epic.description?.body) {
    parts.push(stripHtml(epic.description.body));
  }

  parts.push(`Status: ${epic.workflow_status.name}`);
  parts.push(`Progress: ${Math.round(epic.progress)}%`);

  return parts.join("\n");
}

export async function transformEpic(
  epic: AhaEpic,
  context: AhaTransformContext
): Promise<GenericDocument> {
  const title = epic.name;
  const content = buildEpicContent(epic);
  const metadata: GenericDocument["metadata"] = {
    referenceNum: epic.reference_num,
    status: epic.workflow_status.name,
    statusColor: epic.workflow_status.color,
    progress: String(Math.round(epic.progress)),
    color: epic.color,
    productId: epic.product_id,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_epic_${epic.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: epic.id,
    document_type: "epic",
    document_subtype: epic.workflow_status.name,
    title,
    content,
    created_at: new Date(epic.created_at).getTime(),
    updated_at: new Date(epic.updated_at).getTime(),
    source_type: "aha",
    url: epic.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
