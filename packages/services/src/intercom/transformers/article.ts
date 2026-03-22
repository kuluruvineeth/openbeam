import type { IntercomTransformContext } from "@openbeam/types/services/connectors/intercom";
import type { GenericDocument } from "@openbeam/vespa";
import type { IntercomArticle } from "../api/articles";
import { stripHtml } from "./utils";

export function transformIntercomArticle(
  article: IntercomArticle,
  context: IntercomTransformContext
): GenericDocument {
  const body = article.body ? stripHtml(article.body) : "";
  const description = article.description ?? "";

  const content = [description, body].filter(Boolean).join("\n\n");

  const createdAt = article.created_at * 1000;
  const updatedAt = article.updated_at * 1000;

  return {
    id: `${context.connectorId}_article_${article.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: article.id,
    document_type: "article",
    document_subtype: article.state,
    title: article.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url:
      article.url ??
      `https://app.intercom.com/a/apps/${context.appId ?? "default"}/articles/articles/${article.id}/edit`,
    is_public: article.state === "published",
    access_control: [],
    metadata: {
      state: article.state,
      ...(article.description && { description: article.description }),
    },
  };
}
