import type { CodaTransformContext } from "@openbeam/types/services/connectors/coda";
import type { GenericDocument } from "@openbeam/vespa";
import type { CodaDoc } from "../api/docs";
import { buildCodaDocUrl } from "./utils";

export function transformCodaDoc(
  doc: CodaDoc,
  context: CodaTransformContext
): GenericDocument {
  const parts: string[] = [];
  if (doc.folder?.name) {
    parts.push(`Folder: ${doc.folder.name}`);
  }
  if (doc.ownerName) {
    parts.push(`Owner: ${doc.ownerName}`);
  }
  if (doc.docSize) {
    parts.push(`Pages: ${doc.docSize.pageCount}`);
    parts.push(`Tables: ${doc.docSize.tableAndViewCount}`);
    parts.push(`Rows: ${doc.docSize.totalRowCount}`);
  }

  const content = parts.join(" — ");
  const createdAt = new Date(doc.createdAt).getTime();
  const updatedAt = new Date(doc.updatedAt).getTime();

  return {
    id: `${context.connectorId}_doc_${doc.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: doc.id,
    document_type: "document",
    title: doc.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: doc.browserLink || buildCodaDocUrl(doc.id),
    author_name: doc.ownerName,
    author_email: doc.owner,
    is_public: false,
    access_control: [],
    metadata: {
      ...(doc.folder?.name && { folder: doc.folder.name }),
      ...(doc.ownerName && { ownerName: doc.ownerName }),
      ...(doc.docSize && {
        pageCount: String(doc.docSize.pageCount),
        tableCount: String(doc.docSize.tableAndViewCount),
        rowCount: String(doc.docSize.totalRowCount),
      }),
    },
  };
}
