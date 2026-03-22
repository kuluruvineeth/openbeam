import type { IntercomTransformContext } from "@openbeam/types/services/connectors/intercom";
import type { GenericDocument } from "@openbeam/vespa";
import type { IntercomConversation } from "../api/conversations";
import { stripHtml } from "./utils";

export function transformIntercomConversation(
  conversation: IntercomConversation,
  context: IntercomTransformContext
): GenericDocument {
  const sourceBody = conversation.source?.body
    ? stripHtml(conversation.source.body)
    : "";

  const parts = conversation.conversation_parts?.conversation_parts ?? [];
  const partTexts = parts
    .filter((p) => p.body)
    .map((p) => stripHtml(p.body ?? ""))
    .filter(Boolean);

  const contentParts = [sourceBody, ...partTexts].filter(Boolean);
  const content = contentParts.join("\n\n");

  const title =
    conversation.title ??
    (sourceBody.length > 120
      ? `${sourceBody.slice(0, 120)}...`
      : sourceBody || `Conversation #${conversation.id}`);

  const assigneeName = conversation.assignee?.name;
  const authorName = conversation.source?.author?.name;
  const authorEmail = conversation.source?.author?.email;

  const tagNames = conversation.tags.tags.map((t) => t.name);

  const createdAt = conversation.created_at * 1000;
  const updatedAt = conversation.updated_at * 1000;

  return {
    id: `${context.connectorId}_conversation_${conversation.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: conversation.id,
    document_type: "conversation",
    document_subtype: conversation.state,
    title,
    content,
    author_name: authorName ?? assigneeName,
    author_email: authorEmail,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `https://app.intercom.com/a/inbox/${context.appId ?? "apps"}/inbox/conversation/${conversation.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      state: conversation.state,
      ...(conversation.priority !== "not_priority" && {
        priority: conversation.priority,
      }),
      ...(assigneeName && { assignee: assigneeName }),
      ...(tagNames.length > 0 && { tags: tagNames.join(", ") }),
      messageCount: String(parts.length + 1),
    },
  };
}
