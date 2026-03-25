import type { InteractTransformContext } from "@openbeam/types/services/connectors/interact";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InteractDocument } from "../api/documents";

function buildDocumentContent(doc: InteractDocument): string {
  const parts: string[] = [];

  parts.push(doc.Title);

  if (doc.Description) {
    parts.push(doc.Description);
  }

  if (doc.FileName) {
    parts.push(`File: ${doc.FileName}`);
  }

  if (doc.FileType) {
    parts.push(`Type: ${doc.FileType}`);
  }

  if (doc.FileSize) {
    const sizeMB = (doc.FileSize / (1024 * 1024)).toFixed(2);
    parts.push(`Size: ${sizeMB} MB`);
  }

  if (doc.Author) {
    parts.push(`Author: ${doc.Author.DisplayName}`);
  }

  return parts.join("\n");
}

export async function transformDocument(
  doc: InteractDocument,
  context: InteractTransformContext
): Promise<GenericDocument> {
  const title = doc.Title;
  const content = buildDocumentContent(doc);
  const metadata: GenericDocument["metadata"] = {
    ...(doc.FileName && { fileName: doc.FileName }),
    ...(doc.FileType && { fileType: doc.FileType }),
    ...(doc.FileSize && { fileSize: String(doc.FileSize) }),
    ...(doc.Author && { author: doc.Author.DisplayName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_document_${doc.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: doc.Id,
    document_type: "document",
    document_subtype: doc.FileType ?? "file",
    title,
    content,
    url: doc.Url ?? `${context.instanceUrl}/documents/${doc.Id}`,
    created_at: new Date(doc.CreatedDate).getTime(),
    updated_at: new Date(doc.ModifiedDate).getTime(),
    source_type: "interact",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: doc.Author?.DisplayName,
    author_email: doc.Author?.Email,
  };
}
