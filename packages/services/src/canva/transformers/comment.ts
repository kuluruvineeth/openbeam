import type { CanvaTransformContext } from "@openbeam/types/services/connectors/canva";
import type { GenericDocument } from "@openbeam/vespa";
import type { CanvaComment } from "../api/comments";
import { buildCanvaUrl } from "./utils";

export function transformCanvaComment(
  comment: CanvaComment,
  context: CanvaTransformContext
): GenericDocument {
  const createdAt = new Date(comment.created_at).getTime();
  const updatedAt = new Date(comment.updated_at).getTime();

  return {
    id: `${context.connectorId}_comment_${comment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: comment.id,
    document_type: "comment",
    title: comment.message.slice(0, 100),
    content: comment.message,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildCanvaUrl(comment.design_id),
    author_name: comment.author?.display_name ?? comment.author?.user_id,
    is_public: false,
    access_control: [],
    metadata: {
      designId: comment.design_id,
      ...(comment.thread_id && { threadId: comment.thread_id }),
      ...(comment.reply_count !== undefined && {
        replyCount: String(comment.reply_count),
      }),
    },
  };
}
