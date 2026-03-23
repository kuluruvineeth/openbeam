import type { GuruTransformContext } from "@openbeam/types/services/connectors/guru";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface GuruCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  slug?: string;
  collectionType?: string;
  publicCardsEnabled?: boolean;
  dateCreated?: string;
  lastModified?: string;
}

function buildCollectionContent(collection: GuruCollection): string {
  const parts: string[] = [];

  if (collection.description) {
    parts.push(collection.description);
  }

  if (collection.collectionType) {
    parts.push(`Type: ${collection.collectionType}`);
  }

  if (collection.color) {
    parts.push(`Color: ${collection.color}`);
  }

  return parts.join("\n");
}

export async function transformCollection(
  collection: GuruCollection,
  context: GuruTransformContext
): Promise<GenericDocument> {
  const title = collection.name;
  const content = buildCollectionContent(collection);
  const metadata: GenericDocument["metadata"] = {
    collectionId: collection.id,
    ...(collection.color && { color: collection.color }),
    ...(collection.collectionType && {
      collectionType: collection.collectionType,
    }),
    ...(collection.slug && { slug: collection.slug }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = collection.dateCreated
    ? new Date(collection.dateCreated).getTime()
    : Date.now();
  const updatedAt = collection.lastModified
    ? new Date(collection.lastModified).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_collection_${collection.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: collection.id,
    document_type: "collection",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "guru",
    url: collection.slug
      ? `https://app.getguru.com/collections/${collection.slug}`
      : `https://app.getguru.com/collections/${collection.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
