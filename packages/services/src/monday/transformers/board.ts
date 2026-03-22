import type {
  MondayBoard,
  MondayTransformContext,
} from "@openbeam/types/services/connectors/monday";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildBoardContent(board: MondayBoard): string {
  const parts: string[] = [];

  if (board.description) {
    parts.push(board.description);
  }

  parts.push(`Kind: ${board.board_kind}`);
  parts.push(`State: ${board.state}`);

  if (board.columns?.length) {
    parts.push(`Columns: ${board.columns.map((c) => c.title).join(", ")}`);
  }

  if (board.groups?.length) {
    parts.push(`Groups: ${board.groups.map((g) => g.title).join(", ")}`);
  }

  if (board.owners?.length) {
    parts.push(`Owners: ${board.owners.map((o) => o.name).join(", ")}`);
  }

  return parts.join("\n");
}

export async function transformBoard(
  board: MondayBoard,
  context: MondayTransformContext
): Promise<GenericDocument> {
  const content = buildBoardContent(board);
  const creatorName = board.creator?.name;
  const creatorAvatar = board.creator?.photo_thumb_small ?? undefined;

  const metadata: GenericDocument["metadata"] = {
    boardId: board.id,
    boardKind: board.board_kind,
    boardState: board.state,
    ...(board.workspace_id && { workspaceId: board.workspace_id }),
    ...(board.columns && { columnCount: board.columns.length }),
    ...(board.groups && { groupCount: board.groups.length }),
  };

  const checksum = await calculateDocumentChecksum({
    title: board.name,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_board_${board.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: board.id,
    document_type: "board",
    title: board.name,
    content,
    author_name: creatorName,
    author_avatar_url: creatorAvatar,
    created_at: board.updated_at
      ? new Date(board.updated_at).getTime()
      : Date.now(),
    updated_at: board.updated_at
      ? new Date(board.updated_at).getTime()
      : Date.now(),
    source_type: "monday",
    source_name: context.accountSlug ?? "monday",
    url: board.url,
    is_public: board.board_kind === "public",
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
