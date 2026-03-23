import type { CodaTransformContext } from "@openbeam/types/services/connectors/coda";
import type { GenericDocument } from "@openbeam/vespa";
import type { CodaDoc } from "../api/docs";
import type { CodaPage } from "../api/pages";

export function transformCodaPage(
  page: CodaPage,
  doc: CodaDoc,
  context: CodaTransformContext,
  markdownContent?: string
): GenericDocument {
  const parts: string[] = [];
  if (page.subtitle) {
    parts.push(page.subtitle);
  }
  if (markdownContent) {
    parts.push(markdownContent);
  }
  if (page.parent?.name) {
    parts.push(`Parent: ${page.parent.name}`);
  }

  const content = parts.join("\n\n");
  const createdAt = page.createdAt
    ? new Date(page.createdAt).getTime()
    : new Date(doc.createdAt).getTime();
  const updatedAt = page.updatedAt
    ? new Date(page.updatedAt).getTime()
    : new Date(doc.updatedAt).getTime();

  return {
    id: `${context.connectorId}_page_${doc.id}_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${doc.id}:${page.id}`,
    document_type: "page",
    document_subtype: page.contentType,
    title: page.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: page.browserLink || doc.browserLink,
    author_name: doc.ownerName,
    author_email: doc.owner,
    is_public: false,
    access_control: [],
    metadata: {
      docId: doc.id,
      docName: doc.name,
      ...(page.parent?.name && { parentPage: page.parent.name }),
      contentType: page.contentType || "canvas",
      childCount: String(page.children?.length ?? 0),
    },
  };
}
