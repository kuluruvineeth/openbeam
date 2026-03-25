import type { InteractTransformContext } from "@openbeam/types/services/connectors/interact";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InteractNewsArticle } from "../api/news";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function buildNewsContent(article: InteractNewsArticle): string {
  const parts: string[] = [];

  parts.push(article.Title);

  if (article.Summary) {
    parts.push(stripHtml(article.Summary));
  }

  if (article.Content) {
    parts.push(stripHtml(article.Content));
  }

  if (article.Category) {
    parts.push(`Category: ${article.Category}`);
  }

  if (article.Tags && article.Tags.length > 0) {
    parts.push(`Tags: ${article.Tags.join(", ")}`);
  }

  if (article.Author) {
    parts.push(`Author: ${article.Author.DisplayName}`);
  }

  if (article.PublishedDate) {
    parts.push(`Published: ${article.PublishedDate}`);
  }

  return parts.join("\n");
}

export async function transformNews(
  article: InteractNewsArticle,
  context: InteractTransformContext
): Promise<GenericDocument> {
  const title = article.Title;
  const content = buildNewsContent(article);
  const metadata: GenericDocument["metadata"] = {
    ...(article.Category && { category: article.Category }),
    ...(article.Tags &&
      article.Tags.length > 0 && { tags: article.Tags.join(", ") }),
    ...(article.Author && { author: article.Author.DisplayName }),
    ...(article.PublishedDate && { publishedDate: article.PublishedDate }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_news_${article.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: article.Id,
    document_type: "news",
    document_subtype: article.Category ?? "article",
    title,
    content,
    url: article.Url ?? `${context.instanceUrl}/news/${article.Id}`,
    created_at: new Date(article.CreatedDate).getTime(),
    updated_at: new Date(article.ModifiedDate).getTime(),
    source_type: "interact",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: article.Author?.DisplayName,
    author_email: article.Author?.Email,
  };
}
