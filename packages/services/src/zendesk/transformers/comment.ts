import type { ZendeskTransformContext } from "@openbeam/types/services/connectors/zendesk";
import type { GenericDocument } from "@openbeam/vespa";
import { stripHtml } from "./utils";

export type ZendeskComment = {
  id: number;
  body: string;
  html_body: string | null;
  author_id: number;
  public: boolean;
  created_at: string;
};

export function transformZendeskComment(
  comment: ZendeskComment,
  ticketId: number,
  context: ZendeskTransformContext,
  userLookup?: Map<number, { name: string; email: string }>
): GenericDocument {
  const body = comment.html_body ? stripHtml(comment.html_body) : comment.body;
  const author = userLookup?.get(comment.author_id);

  const createdAt = new Date(comment.created_at).getTime();

  return {
    id: `${context.connectorId}_comment_${comment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(comment.id),
    document_type: "comment",
    title: `Comment on ticket #${ticketId}`,
    content: body,
    author_name: author?.name,
    author_email: author?.email,
    created_at: createdAt,
    updated_at: createdAt,
    url: `https://${context.subdomain}.zendesk.com/agent/tickets/${ticketId}`,
    is_public: comment.public,
    access_control: [],
    metadata: {
      ticketId: String(ticketId),
      isPublic: comment.public,
    },
  };
}
