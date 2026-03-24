import type { FellowTransformContext } from "@openbeam/types/services/connectors/fellow";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FellowActionItem } from "../api/action-items";

function buildActionItemContent(item: FellowActionItem): string {
  const parts: string[] = [];

  if (item.description) {
    parts.push(item.description);
  }

  parts.push(`Status: ${item.completed ? "Completed" : "Open"}`);

  if (item.assignee) {
    parts.push(`Assigned to: ${item.assignee.name ?? item.assignee.email}`);
  }

  if (item.due_date) {
    parts.push(`Due: ${item.due_date}`);
  }

  if (item.meeting_title) {
    parts.push(`Meeting: ${item.meeting_title}`);
  }

  if (item.completed_at) {
    parts.push(`Completed: ${item.completed_at}`);
  }

  return parts.join("\n");
}

export async function transformActionItem(
  item: FellowActionItem,
  context: FellowTransformContext
): Promise<GenericDocument> {
  const title = item.title;
  const content = buildActionItemContent(item);
  const metadata: GenericDocument["metadata"] = {
    completed: item.completed,
    ...(item.assignee && {
      assignee: item.assignee.name ?? item.assignee.email,
    }),
    ...(item.due_date && { dueDate: item.due_date }),
    ...(item.meeting_id && { meetingId: item.meeting_id }),
    ...(item.meeting_title && { meetingTitle: item.meeting_title }),
    ...(item.completed_at && { completedAt: item.completed_at }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_action_item_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: item.id,
    document_type: "action_item",
    document_subtype: item.completed ? "completed" : "open",
    title,
    content,
    created_at: new Date(item.created_at).getTime(),
    updated_at: new Date(item.updated_at).getTime(),
    source_type: "fellow",
    url: item.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: item.assignee?.name,
    author_email: item.assignee?.email,
  };
}
