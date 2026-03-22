import type {
  MondayItem,
  MondayTransformContext,
  MondayUpdate,
} from "@openbeam/types/services/connectors/monday";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface ItemTransformOptions {
  updates?: MondayUpdate[];
}

function buildItemContent(
  item: MondayItem,
  options: ItemTransformOptions
): string {
  const parts: string[] = [];

  if (item.group) {
    parts.push(`Group: ${item.group.title}`);
  }

  if (item.column_values?.length) {
    for (const cv of item.column_values) {
      if (cv.text) {
        const label = cv.title ?? cv.id;
        parts.push(`${label}: ${cv.text}`);
      }
    }
  }

  if (item.board) {
    parts.push(`Board: ${item.board.name}`);
  }

  if (item.subitems?.length) {
    parts.push(`Subitems: ${item.subitems.map((s) => s.name).join(", ")}`);
  }

  if (options.updates?.length) {
    parts.push("\n--- Updates ---");
    for (const update of options.updates) {
      const author = update.creator?.name ?? "Unknown";
      const body = update.text_body ?? update.body;
      parts.push(`${author}: ${body}`);
    }
  }

  return parts.join("\n");
}

function buildItemUrl(item: MondayItem): string {
  if (item.url) {
    return item.url;
  }
  return `https://monday.com/boards/${item.board?.id ?? "unknown"}/pulses/${item.id}`;
}

export async function transformItem(
  item: MondayItem,
  context: MondayTransformContext,
  options: ItemTransformOptions = {}
): Promise<GenericDocument> {
  const content = buildItemContent(item, options);
  const creatorName = item.creator?.name;
  const creatorAvatar = item.creator?.photo_thumb_small ?? undefined;

  const metadata: GenericDocument["metadata"] = {
    itemId: item.id,
    ...(item.state && { itemState: item.state }),
    ...(item.group && {
      groupId: item.group.id,
      groupTitle: item.group.title,
    }),
    ...(item.board && {
      boardId: item.board.id,
      boardName: item.board.name,
    }),
    ...(options.updates && { updateCount: options.updates.length }),
    ...(item.subitems && { subitemCount: item.subitems.length }),
  };

  const checksum = await calculateDocumentChecksum({
    title: item.name,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_item_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: item.id,
    document_type: "item",
    title: item.name,
    content,
    author_name: creatorName,
    author_avatar_url: creatorAvatar,
    created_at: new Date(item.created_at).getTime(),
    updated_at: item.updated_at
      ? new Date(item.updated_at).getTime()
      : new Date(item.created_at).getTime(),
    source_type: "monday",
    source_name: context.accountSlug ?? "monday",
    url: buildItemUrl(item),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
