import type {
  FigmaComment,
  FigmaTransformContext,
} from "@openbeam/types/services/connectors/figma";
import type { GenericDocument } from "@openbeam/vespa";

export function transformFigmaComment(
  comment: FigmaComment,
  fileName: string,
  context: FigmaTransformContext
): GenericDocument {
  const fileKey = comment.file_key ?? "";
  const createdAt = new Date(comment.created_at).getTime();
  const isResolved = Boolean(comment.resolved_at);

  return {
    id: `${context.connectorId}_comment_${comment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: comment.id,
    document_type: "comment",
    document_subtype: isResolved ? "resolved" : "active",
    title: `Comment on ${fileName}`,
    content: comment.message,
    author_name: comment.user.handle,
    created_at: createdAt,
    updated_at: createdAt,
    url: `https://www.figma.com/design/${fileKey}`,
    is_public: false,
    access_control: [],
    metadata: {
      fileKey,
      fileName,
      authorHandle: comment.user.handle,
      resolved: String(isResolved),
      ...(comment.resolved_at && { resolvedAt: comment.resolved_at }),
      ...(comment.parent_id && { parentCommentId: comment.parent_id }),
    },
  };
}
