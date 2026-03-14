import type {
  OwaspDocument,
  OwaspTransformContext,
} from "@openbeam/types/services/connectors/owasp";
import type { GenericDocument } from "@openbeam/vespa";

function buildDocumentId(
  connectorId: string,
  project: string,
  sha: string
): string {
  return `${connectorId}_security_guide_${project}_${sha}`;
}

export function transformOwaspDocument(
  doc: OwaspDocument,
  context: OwaspTransformContext
): GenericDocument {
  return {
    id: buildDocumentId(context.connectorId, context.project, doc.sha),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: doc.sha,
    document_type: "security_guide",
    document_subtype: context.project,
    title: doc.name,
    content: doc.content,
    author_id: undefined,
    author_name: "OWASP Foundation",
    author_avatar_url: undefined,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_id: context.project,
    source_type: "owasp",
    source_name: "OWASP",
    url: doc.url ?? "",
    is_public: true,
    access_control: [],
    metadata: {
      project: context.project,
      filePath: doc.path,
      sha: doc.sha,
    },
    checksum: doc.sha,
  };
}
