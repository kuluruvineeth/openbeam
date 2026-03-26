import type { ProcoreTransformContext } from "@openbeam/types/services/connectors/procore";
import type { GenericDocument } from "@openbeam/vespa";
import type { ProcoreDocument } from "../api/documents";
import { buildProcoreUrl } from "./utils";

export function transformProcoreDocument(
  doc: ProcoreDocument,
  projectId: number,
  context: ProcoreTransformContext
): GenericDocument {
  const parts = [
    doc.document_type ? `Type: ${doc.document_type}` : null,
    doc.size ? `Size: ${formatBytes(doc.size)}` : null,
    doc.parent ? `Folder: ${doc.parent.name}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(doc.created_at).getTime();
  const updatedAt = new Date(doc.updated_at).getTime();

  return {
    id: `${context.connectorId}_document_${doc.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(doc.id),
    document_type: "document",
    document_subtype: doc.document_type ?? undefined,
    title: doc.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildProcoreUrl(projectId, "documents", doc.id),
    author_name: doc.created_by?.name,
    is_public: !doc.private,
    access_control: [],
    metadata: {
      ...(doc.document_type && { documentType: doc.document_type }),
      ...(doc.size && { size: String(doc.size) }),
      ...(doc.parent && { folder: doc.parent.name }),
      projectId: String(projectId),
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
