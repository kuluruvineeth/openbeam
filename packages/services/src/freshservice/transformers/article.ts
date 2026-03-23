import type { FreshserviceTransformContext } from "@openbeam/types/services/connectors/freshservice";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

const ARTICLE_STATUS_MAP: Record<number, string> = {
  1: "Draft",
  2: "Published",
};

export interface FreshserviceArticle {
  id: number;
  title: string;
  description?: string;
  description_text?: string;
  status: number;
  folder_id?: number;
  category_id?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  agent_id?: number;
  folder?: { name?: string };
  category?: { name?: string };
}

function buildArticleContent(article: FreshserviceArticle): string {
  const parts: string[] = [];

  if (article.description_text) {
    parts.push(article.description_text);
  }

  parts.push(
    `Status: ${ARTICLE_STATUS_MAP[article.status] ?? String(article.status)}`
  );

  if (article.folder?.name) {
    parts.push(`Folder: ${article.folder.name}`);
  }

  if (article.category?.name) {
    parts.push(`Category: ${article.category.name}`);
  }

  if (article.tags?.length) {
    parts.push(`Tags: ${article.tags.join(", ")}`);
  }

  return parts.join("\n");
}

function buildArticleMetadata(
  article: FreshserviceArticle
): GenericDocument["metadata"] {
  return {
    articleId: article.id,
    status: ARTICLE_STATUS_MAP[article.status] ?? String(article.status),
    ...(article.folder_id && { folderId: article.folder_id }),
    ...(article.folder?.name && { folderName: article.folder.name }),
    ...(article.category_id && { categoryId: article.category_id }),
    ...(article.category?.name && { categoryName: article.category.name }),
    ...(article.tags?.length && { tags: article.tags.join(", ") }),
  };
}

export async function transformArticle(
  article: FreshserviceArticle,
  context: FreshserviceTransformContext
): Promise<GenericDocument> {
  const title = article.title;
  const content = buildArticleContent(article);
  const metadata = buildArticleMetadata(article);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

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
    document_subtype: ARTICLE_STATUS_MAP[article.status] ?? "unknown",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "freshservice",
    source_name: context.domain,
    url: `https://${context.domain}.freshservice.com/support/solutions/articles/${article.id}`,
    is_public: true,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
