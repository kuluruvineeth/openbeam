import type { IroncladTransformContext } from "@openbeam/types/services/connectors/ironclad";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { IroncladComment } from "../api/comments";
import { stripHtml } from "./utils";

function buildCommentContent(comment: IroncladComment): string {
  return stripHtml(comment.body);
}

export async function transformComment(
  comment: IroncladComment,
  workflowTitle: string,
  context: IroncladTransformContext
): Promise<GenericDocument> {
  const bodyPreview = stripHtml(comment.body).slice(0, 80);
  const title = `Comment on ${workflowTitle}: ${bodyPreview}`;
  const content = buildCommentContent(comment);

  const metadata: GenericDocument["metadata"] = {
    workflowId: comment.workflowId,
    authorName: comment.author?.name,
    authorEmail: comment.author?.email,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_comment_${comment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: comment.id,
    document_type: "comment",
    title,
    content,
    created_at: new Date(comment.created).getTime(),
    updated_at: new Date(comment.lastUpdated).getTime(),
    source_type: "ironclad",
    url: `https://ironcladapp.com/workflow/${comment.workflowId}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: comment.author?.name,
    author_email: comment.author?.email,
  };
}
