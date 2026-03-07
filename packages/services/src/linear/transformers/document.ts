import type {
  LinearDocument,
  LinearTransformContext,
} from "@openbeam/types/services/connectors/linear";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildDocumentId(connectorId: string, documentId: string): string {
  return `${connectorId}_document_${documentId}`;
}

function buildDocumentMetadata(
  document: LinearDocument
): GenericDocument["metadata"] {
  return {
    documentId: document.id,
    ...(document.icon && { icon: document.icon }),
    ...(document.color && { color: document.color }),
    ...(document.project && {
      projectId: document.project.id,
      projectName: document.project.name,
    }),
    ...(document.archivedAt && { archivedAt: document.archivedAt }),
  };
}

export async function transformDocument(
  document: LinearDocument,
  context: LinearTransformContext
): Promise<GenericDocument> {
  const creatorId = document.creator?.id;
  const creatorName = creatorId
    ? (context.userLookup?.getName(creatorId) ?? document.creator?.displayName)
    : undefined;
  const creatorAvatar = creatorId
    ? (context.userLookup?.getAvatar(creatorId) ?? document.creator?.avatarUrl)
    : undefined;

  const content = document.content ?? "";
  const metadata = buildDocumentMetadata(document);

  const checksum = await calculateDocumentChecksum({
    title: document.title,
    content,
    metadata,
  });

  return {
    id: buildDocumentId(context.connectorId, document.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: document.id,
    document_type: "document",
    document_subtype: document.project ? "project_doc" : "standalone",
    title: document.title,
    content,
    author_id: creatorId,
    author_name: creatorName,
    author_avatar_url: creatorAvatar ?? undefined,
    created_at: new Date(document.createdAt).getTime(),
    updated_at: new Date(document.updatedAt).getTime(),
    source_id: document.project?.id ?? context.workspaceId,
    source_type: "linear",
    source_name: context.organizationName,
    url: document.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDocuments(
  documents: LinearDocument[],
  context: LinearTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(documents.map((doc) => transformDocument(doc, context)));
}
