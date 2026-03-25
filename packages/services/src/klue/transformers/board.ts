import type { KlueTransformContext } from "@openbeam/types/services/connectors/klue";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { KlueBoard } from "../api/boards";
import { stripHtml } from "./utils";

function buildBoardContent(board: KlueBoard): string {
  const parts: string[] = [];

  if (board.description) {
    parts.push(stripHtml(board.description));
  }

  parts.push(`Cards: ${board.card_count}`);

  if (board.owner) {
    parts.push(`Owner: ${board.owner.name}`);
  }

  return parts.join("\n");
}

export async function transformBoard(
  board: KlueBoard,
  context: KlueTransformContext
): Promise<GenericDocument> {
  const title = board.name;
  const content = buildBoardContent(board);
  const metadata: GenericDocument["metadata"] = {
    cardCount: String(board.card_count),
    ...(board.owner && {
      owner: board.owner.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
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
    title,
    content,
    created_at: new Date(board.created_at).getTime(),
    updated_at: new Date(board.updated_at).getTime(),
    source_type: "klue",
    url: `https://app.klue.com/boards/${board.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: board.owner?.name,
  };
}
