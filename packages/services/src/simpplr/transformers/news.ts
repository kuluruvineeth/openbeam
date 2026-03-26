import type { SimpplrTransformContext } from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SimpplrNewsArticle } from "../api/news";

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

function buildNewsContent(article: SimpplrNewsArticle): string {
  const parts: string[] = [article.title];

  if (article.summary) {
    parts.push(stripHtml(article.summary));
  }

  if (article.content) {
    parts.push(stripHtml(article.content));
  }

  if (article.category) {
    parts.push(`Category: ${article.category}`);
  }

  if (article.tags && article.tags.length > 0) {
    parts.push(`Tags: ${article.tags.join(", ")}`);
  }

  if (article.author) {
    parts.push(`Author: ${article.author.displayName}`);
  }

  return parts.join("\n");
}

export async function transformNews(
  article: SimpplrNewsArticle,
  context: SimpplrTransformContext
): Promise<GenericDocument> {
  const title = article.title;
  const content = buildNewsContent(article);
  const metadata: GenericDocument["metadata"] = {
    ...(article.category && { category: article.category }),
    ...(article.tags &&
      article.tags.length > 0 && { tags: article.tags.join(", ") }),
    ...(article.publishedAt && { publishedAt: article.publishedAt }),
    ...(article.author && { author: article.author.displayName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_news_${article.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: article.id,
    document_type: "news",
    document_subtype: article.category,
    title,
    content,
    url: article.url ?? `${context.instanceUrl}/news/${article.id}`,
    created_at: new Date(article.createdAt).getTime(),
    updated_at: new Date(article.updatedAt).getTime(),
    source_type: "simpplr",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: article.author?.displayName,
    author_email: article.author?.email,
  };
}
