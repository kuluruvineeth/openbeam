import type { SalesforceTransformContext } from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";
import { stripHtml } from "./utils";

export type SalesforceKnowledgeArticle = {
  Id: string;
  Title: string;
  Summary?: string;
  ArticleBody?: string;
  UrlName: string;
  ArticleNumber: string;
  PublishStatus: string;
  VersionNumber: number;
  KnowledgeArticleId: string;
  CreatedDate: string;
  LastModifiedDate: string;
  SystemModstamp: string;
  CreatedBy?: { Name?: string; Email?: string };
  LastModifiedBy?: { Name?: string };
};

export function transformSalesforceArticle(
  article: SalesforceKnowledgeArticle,
  context: SalesforceTransformContext
): GenericDocument {
  const body = article.ArticleBody ? stripHtml(article.ArticleBody) : "";
  const content = [article.Summary, body].filter(Boolean).join(" — ");

  const createdAt = new Date(article.CreatedDate).getTime();
  const updatedAt = new Date(article.LastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_article_${article.KnowledgeArticleId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: article.KnowledgeArticleId,
    document_type: "article",
    document_subtype: "knowledge",
    title: article.Title,
    content,
    author_name: article.CreatedBy?.Name,
    author_email: article.CreatedBy?.Email,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.instanceUrl}/lightning/r/Knowledge__kav/${article.Id}/view`,
    is_public: false,
    access_control: [],
    metadata: {
      articleNumber: article.ArticleNumber,
      publishStatus: article.PublishStatus,
      version: article.VersionNumber,
    },
  };
}
