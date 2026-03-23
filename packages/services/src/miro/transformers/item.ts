import type { MiroTransformContext } from "@openbeam/types/services/connectors/miro";
import type { GenericDocument } from "@openbeam/vespa";
import type { MiroItem } from "../api/items";
import { buildMiroBoardUrl, extractItemContent } from "./utils";

export function transformMiroItem(
  item: MiroItem,
  boardId: string,
  boardName: string,
  context: MiroTransformContext
): GenericDocument {
  const content = extractItemContent(item.data);
  const createdAt = new Date(item.createdAt).getTime();
  const updatedAt = new Date(item.modifiedAt).getTime();

  const title =
    item.data.title ||
    item.data.content?.replace(/<[^>]*>/g, "").slice(0, 100) ||
    `${item.type} on ${boardName}`;

  return {
    id: `${context.connectorId}_item_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: item.id,
    document_type: "page",
    document_subtype: item.type,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildMiroBoardUrl(boardId),
    author_name: item.createdBy?.name,
    is_public: false,
    access_control: [],
    metadata: {
      itemType: item.type,
      boardId,
      boardName,
      ...(item.data.shape && { shape: item.data.shape }),
      ...(item.parent?.id && { parentId: item.parent.id }),
    },
  };
}
