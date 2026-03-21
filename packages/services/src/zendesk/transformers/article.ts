import type { ZendeskTransformContext } from "@openbeam/types/services/connectors/zendesk";
import type { GenericDocument } from "@openbeam/vespa";
import { stripHtml } from "./utils";

export type ZendeskArticle = {
  id: number;
  title: string;
  body: string | null;
  section_id: number | null;
  author_id: number;
  draft: boolean;
  label_names: string[];
  created_at: string;
  updated_at: string;
  html_url: string;
};

export function transformZendeskArticle(
  article: ZendeskArticle,
  context: ZendeskTransformContext,
  userLookup?: Map<number, { name: string; email: string }>
): GenericDocument {
  const body = article.body ? stripHtml(article.body) : "";
  const author = userLookup?.get(article.author_id);

  const createdAt = new Date(article.created_at).getTime();
  const updatedAt = new Date(article.updated_at).getTime();

  return {
    id: `${context.connectorId}_article_${article.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(article.id),
    document_type: "article",
    title: article.title,
    content: body,
    author_name: author?.name,
    author_email: author?.email,
    created_at: createdAt,
    updated_at: updatedAt,
    url:
      article.html_url ??
      `https://${context.subdomain}.zendesk.com/hc/articles/${article.id}`,
    is_public: !article.draft,
    access_control: [],
    metadata: {
      draft: article.draft,
      ...(article.label_names.length > 0 && {
        labels: article.label_names.join(", "),
      }),
    },
  };
}
