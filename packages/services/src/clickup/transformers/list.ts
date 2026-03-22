import type {
  ClickUpList,
  ClickUpTransformContext,
} from "@openbeam/types/services/connectors/clickup";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildListDocumentId(connectorId: string, listId: string): string {
  return `${connectorId}_list_${listId}`;
}

function buildListContent(list: ClickUpList): string {
  const parts: string[] = [];

  if (list.content) {
    parts.push(list.content);
  }

  if (list.status) {
    parts.push(`Status: ${list.status.status}`);
  }

  if (list.task_count !== null && list.task_count !== undefined) {
    parts.push(`Tasks: ${list.task_count}`);
  }

  return parts.join("\n");
}

export async function transformList(
  list: ClickUpList,
  context: ClickUpTransformContext
): Promise<GenericDocument> {
  const content = buildListContent(list);
  const metadata: GenericDocument["metadata"] = {
    listId: list.id,
    archived: list.archived,
    ...(list.space && { spaceId: list.space.id }),
    ...(list.folder && {
      folderId: list.folder.id,
      folderName: list.folder.name,
    }),
    ...(list.task_count !== null &&
      list.task_count !== undefined && { taskCount: list.task_count }),
  };

  const checksum = await calculateDocumentChecksum({
    title: list.name,
    content,
    metadata,
  });

  return {
    id: buildListDocumentId(context.connectorId, list.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: list.id,
    document_type: "list",
    title: list.name,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_id: list.space?.id ?? context.workspaceId,
    source_type: "clickup",
    source_name: context.workspaceName,
    url: `https://app.clickup.com/${context.workspaceId}/v/li/${list.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
