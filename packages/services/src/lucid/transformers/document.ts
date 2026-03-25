import type { LucidTransformContext } from "@openbeam/types/services/connectors/lucid";
import type { GenericDocument } from "@openbeam/vespa";
import type { LucidDocument } from "../api/documents";

export function transformLucidDocument(
  doc: LucidDocument,
  context: LucidTransformContext
): GenericDocument {
  const parts = [
    doc.product ? `Product: ${doc.product}` : null,
    doc.status ? `Status: ${doc.status}` : null,
    doc.pageCount ? `Pages: ${doc.pageCount}` : null,
    doc.creatorName ? `Created by: ${doc.creatorName}` : null,
    doc.lastEditorName ? `Last edited by: ${doc.lastEditorName}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(doc.createdDate).getTime();
  const updatedAt = new Date(doc.lastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_document_${doc.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: doc.id,
    document_type: "document",
    document_subtype: doc.product,
    title: doc.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: doc.editUrl || doc.viewUrl,
    author_name: doc.creatorName,
    is_public: false,
    access_control: [],
    metadata: {
      ...(doc.product && { product: doc.product }),
      ...(doc.status && { status: doc.status }),
      ...(doc.pageCount && { pageCount: String(doc.pageCount) }),
      ...(doc.creatorName && { creatorName: doc.creatorName }),
      ...(doc.lastEditorName && { lastEditorName: doc.lastEditorName }),
      ...(doc.parentFolderId && { parentFolderId: doc.parentFolderId }),
    },
  };
}
