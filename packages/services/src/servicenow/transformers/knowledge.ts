import type { ServiceNowTransformContext } from "@openbeam/types/services/connectors/servicenow";
import type { GenericDocument } from "@openbeam/vespa";
import { extractDisplayValue, parseServiceNowDate, stripHtml } from "./utils";

export type ServiceNowKnowledgeArticle = {
  sys_id: string;
  number: string;
  short_description: string;
  text: string;
  workflow_state: string;
  author: string | { display_value?: string; value?: string };
  kb_category: string | { display_value?: string; value?: string };
  sys_created_on: string;
  sys_updated_on: string;
};

export function transformServiceNowKnowledgeArticle(
  article: ServiceNowKnowledgeArticle,
  context: ServiceNowTransformContext
): GenericDocument {
  const body = article.text ? stripHtml(article.text) : "";
  const authorName = extractDisplayValue(article.author);
  const categoryName = extractDisplayValue(article.kb_category);

  return {
    id: `${context.connectorId}_article_${article.sys_id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: article.sys_id,
    document_type: "article",
    document_subtype: "knowledge",
    title: article.short_description || `Article ${article.number}`,
    content: body,
    author_name: authorName || undefined,
    created_at: parseServiceNowDate(article.sys_created_on),
    updated_at: parseServiceNowDate(article.sys_updated_on),
    url: `https://${context.instance}.service-now.com/nav_to.do?uri=kb_knowledge.do?sys_id=${article.sys_id}`,
    is_public: false,
    access_control: [],
    metadata: {
      number: article.number,
      workflowState: article.workflow_state,
      ...(categoryName && { category: categoryName }),
      ...(authorName && { author: authorName }),
    },
  };
}
