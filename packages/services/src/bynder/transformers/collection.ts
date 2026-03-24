import type { BynderTransformContext } from "@openbeam/types/services/connectors/bynder";
import type { GenericDocument } from "@openbeam/vespa";
import type { BynderCollection } from "../client";

function buildCollectionUrl(domain: string, collectionId: string): string {
  return `https://${domain}.bynder.com/collections/${collectionId}/`;
}

export function transformBynderCollection(
  collection: BynderCollection,
  context: BynderTransformContext
): GenericDocument {
  const createdAt = new Date(collection.dateCreated).getTime();
  const updatedAt = new Date(collection.dateModified).getTime();

  const contentParts = [collection.name];
  if (collection.description) {
    contentParts.push(collection.description);
  }

  return {
    id: `${context.connectorId}_collection_${collection.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: collection.id,
    document_type: "collection",
    document_subtype: "collection",
    title: collection.name,
    content: contentParts.join(" "),
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildCollectionUrl(context.domain, collection.id),
    is_public: collection.isPublic,
    access_control: [],
    metadata: {
      ...(collection.mediaCount > 0 && { mediaCount: collection.mediaCount }),
      ...(collection.collectionCount > 0 && {
        collectionCount: collection.collectionCount,
      }),
    },
  };
}
