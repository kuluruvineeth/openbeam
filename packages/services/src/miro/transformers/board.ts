import type { MiroTransformContext } from "@openbeam/types/services/connectors/miro";
import type { GenericDocument } from "@openbeam/vespa";
import type { MiroBoard } from "../api/boards";
import { buildMiroBoardUrl } from "./utils";

export function transformMiroBoard(
  board: MiroBoard,
  context: MiroTransformContext
): GenericDocument {
  const parts = [
    board.description ? board.description : null,
    board.owner?.name ? `Owner: ${board.owner.name}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(board.createdAt).getTime();
  const updatedAt = new Date(board.modifiedAt).getTime();

  return {
    id: `${context.connectorId}_board_${board.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: board.id,
    document_type: "document",
    document_subtype: "whiteboard",
    title: board.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: board.viewLink || buildMiroBoardUrl(board.id),
    author_name: board.createdBy?.name,
    is_public: false,
    access_control: [],
    metadata: {
      ...(board.owner?.name && { ownerName: board.owner.name }),
      ...(board.team?.name && { teamName: board.team.name }),
      boardId: board.id,
    },
  };
}
