import type { LucidTransformContext } from "@openbeam/types/services/connectors/lucid";
import type { GenericDocument } from "@openbeam/vespa";
import type { LucidPage } from "../api/pages";

export function transformLucidPage(
  page: LucidPage,
  documentTitle: string,
  documentUrl: string,
  context: LucidTransformContext
): GenericDocument {
  const content = `Page ${page.index + 1} of "${documentTitle}"`;
  const now = Date.now();

  return {
    id: `${context.connectorId}_page_${page.documentId}_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${page.documentId}:${page.id}`,
    document_type: "page",
    title: page.title || `Page ${page.index + 1}`,
    content,
    created_at: now,
    updated_at: now,
    url: documentUrl,
    is_public: false,
    access_control: [],
    metadata: {
      documentId: page.documentId,
      documentTitle,
      pageIndex: String(page.index),
    },
  };
}
