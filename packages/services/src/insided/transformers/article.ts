import type { InsidedTransformContext } from "@openbeam/types/services/connectors/insided";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InsidedArticle } from "../api/articles";
import { stripHtml } from "./utils";

function buildArticleContent(article: InsidedArticle): string {
  const parts: string[] = [];

  if (article.content_html) {
    parts.push(stripHtml(article.content_html));
  } else if (article.content) {
    parts.push(article.content);
  }

  parts.push(`Category: ${article.category.name}`);
  parts.push(`Author: ${article.author.name}`);
  parts.push(`Status: ${article.status}`);

  if (article.view_count > 0) {
    parts.push(`Views: ${article.view_count}`);
  }

  if (article.helpful_count > 0) {
    parts.push(`Helpful votes: ${article.helpful_count}`);
  }

  return parts.join("\n");
}

export async function transformArticle(
  article: InsidedArticle,
  context: InsidedTransformContext
): Promise<GenericDocument> {
  const title = article.title;
  const content = buildArticleContent(article);
  const metadata: GenericDocument["metadata"] = {
    category: article.category.name,
    categorySlug: article.category.slug,
    status: article.status,
    viewCount: String(article.view_count),
    helpfulCount: String(article.helpful_count),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_article_${article.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: article.id,
    document_type: "article",
    document_subtype: article.category.name,
    title,
    content,
    created_at: new Date(article.created_at).getTime(),
    updated_at: new Date(article.updated_at).getTime(),
    source_type: "insided",
    url: article.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: article.author.name,
  };
}
