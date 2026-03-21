import type { ConfluenceTransformContext } from "@openbeam/types/services/connectors/confluence";
import type { GenericDocument } from "@openbeam/vespa";
import type { ConfluenceComment } from "../api/comments";

type CommentContext = {
  pageId: string;
  pageTitle: string;
  spaceKey?: string;
  spaceName?: string;
};

function stripXhtml(xhtml: string): string {
  return xhtml
    .replace(/<ac:[^>]*\/>/gi, "")
    .replace(/<ac:[^>]*>[\s\S]*?<\/ac:[^>]+>/gi, "")
    .replace(/<ri:[^>]*\/>/gi, "")
    .replace(/<ri:[^>]*>[\s\S]*?<\/ri:[^>]+>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function transformConfluenceComment(
  comment: ConfluenceComment,
  context: ConfluenceTransformContext,
  commentCtx: CommentContext
): GenericDocument {
  const content = comment.body?.storage?.value
    ? stripXhtml(comment.body.storage.value)
    : "";

  const createdAt = comment.createdAt
    ? new Date(comment.createdAt).getTime()
    : Date.now();
  const updatedAt = comment.version?.createdAt
    ? new Date(comment.version.createdAt).getTime()
    : createdAt;

  const authorId = comment.version?.authorId ?? comment.authorId;

  return {
    id: `${context.connectorId}_comment_${comment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: comment.id,
    document_type: "comment",
    document_subtype: "comment",
    title: `Comment on: ${commentCtx.pageTitle}`,
    content,
    author_id: authorId,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.siteUrl}/wiki/pages/viewpage.action?pageId=${commentCtx.pageId}`,
    is_public: false,
    access_control: [],
    metadata: {
      pageId: commentCtx.pageId,
      pageTitle: commentCtx.pageTitle,
      ...(commentCtx.spaceKey && { spaceKey: commentCtx.spaceKey }),
      ...(commentCtx.spaceName && { spaceName: commentCtx.spaceName }),
      status: comment.status,
      ...(comment.version && { version: comment.version.number }),
    },
  };
}
