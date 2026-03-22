import type { IntercomTransformContext } from "@openbeam/types/services/connectors/intercom";
import type { GenericDocument } from "@openbeam/vespa";
import type { IntercomCollection } from "../api/collections";

export function transformIntercomCollection(
  collection: IntercomCollection,
  context: IntercomTransformContext
): GenericDocument {
  const createdAt = collection.created_at * 1000;
  const updatedAt = collection.updated_at * 1000;

  return {
    id: `${context.connectorId}_collection_${collection.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: collection.id,
    document_type: "collection",
    title: collection.name,
    content: collection.description ?? "",
    created_at: createdAt,
    updated_at: updatedAt,
    url:
      collection.url ??
      `https://app.intercom.com/a/apps/${context.appId ?? "default"}/articles/collections/${collection.id}`,
    is_public: true,
    access_control: [],
    metadata: {},
  };
}
