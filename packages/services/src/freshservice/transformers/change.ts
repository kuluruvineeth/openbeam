import type { FreshserviceTransformContext } from "@openbeam/types/services/connectors/freshservice";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

const CHANGE_STATUS_MAP: Record<number, string> = {
  1: "Open",
  2: "Planning",
  3: "Awaiting Approval",
  4: "Pending Release",
  5: "Pending Review",
  6: "Closed",
};

const CHANGE_TYPE_MAP: Record<number, string> = {
  1: "Minor",
  2: "Standard",
  3: "Major",
  4: "Emergency",
};

const CHANGE_PRIORITY_MAP: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

export interface FreshserviceChange {
  id: number;
  subject: string;
  description_text?: string;
  status: number;
  priority: number;
  change_type: number;
  requester_id?: number;
  agent_id?: number;
  group_id?: number;
  created_at: string;
  updated_at: string;
  planned_start_date?: string;
  planned_end_date?: string;
  category?: string;
  sub_category?: string;
}

function buildChangeContent(change: FreshserviceChange): string {
  const parts: string[] = [];

  if (change.description_text) {
    parts.push(change.description_text);
  }

  parts.push(
    `Status: ${CHANGE_STATUS_MAP[change.status] ?? String(change.status)}`
  );
  parts.push(
    `Priority: ${CHANGE_PRIORITY_MAP[change.priority] ?? String(change.priority)}`
  );
  parts.push(
    `Change Type: ${CHANGE_TYPE_MAP[change.change_type] ?? String(change.change_type)}`
  );

  if (change.category) {
    parts.push(`Category: ${change.category}`);
  }

  if (change.planned_start_date) {
    parts.push(`Planned Start: ${change.planned_start_date}`);
  }

  if (change.planned_end_date) {
    parts.push(`Planned End: ${change.planned_end_date}`);
  }

  return parts.join("\n");
}

function buildChangeMetadata(
  change: FreshserviceChange
): GenericDocument["metadata"] {
  return {
    changeId: change.id,
    status: CHANGE_STATUS_MAP[change.status] ?? String(change.status),
    priority: CHANGE_PRIORITY_MAP[change.priority] ?? String(change.priority),
    changeType:
      CHANGE_TYPE_MAP[change.change_type] ?? String(change.change_type),
    ...(change.category && { category: change.category }),
    ...(change.sub_category && { subCategory: change.sub_category }),
    ...(change.planned_start_date && {
      plannedStart: change.planned_start_date,
    }),
    ...(change.planned_end_date && { plannedEnd: change.planned_end_date }),
  };
}

export async function transformChange(
  change: FreshserviceChange,
  context: FreshserviceTransformContext
): Promise<GenericDocument> {
  const title = `[Change #${change.id}] ${change.subject}`;
  const content = buildChangeContent(change);
  const metadata = buildChangeMetadata(change);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(change.created_at).getTime();
  const updatedAt = new Date(change.updated_at).getTime();

  return {
    id: `${context.connectorId}_change_${change.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(change.id),
    document_type: "change",
    document_subtype: CHANGE_TYPE_MAP[change.change_type] ?? "unknown",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "freshservice",
    source_name: context.domain,
    url: `https://${context.domain}.freshservice.com/itil/changes/${change.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
