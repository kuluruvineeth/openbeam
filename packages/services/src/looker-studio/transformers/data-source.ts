import type { LookerStudioTransformContext } from "@openbeam/types/services/connectors/looker-studio";
import type { GenericDocument } from "@openbeam/vespa";
import type { LookerStudioDataSource } from "../api/data-sources";

export function transformDataSource(
  dataSource: LookerStudioDataSource,
  context: LookerStudioTransformContext
): GenericDocument {
  const owner = dataSource.owners?.[0];
  const createdAt = new Date(dataSource.createdTime).getTime();
  const updatedAt = new Date(dataSource.modifiedTime).getTime();

  const parts = [
    dataSource.description ?? null,
    owner ? `Owner: ${owner.displayName}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_datasource_${dataSource.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: dataSource.id,
    document_type: "data_source",
    document_subtype: "connector",
    title: dataSource.name,
    content: parts.join(" — "),
    created_at: createdAt,
    updated_at: updatedAt,
    url:
      dataSource.webViewLink ??
      `https://lookerstudio.google.com/datasources/${dataSource.id}`,
    author_name: owner?.displayName,
    author_email: owner?.emailAddress,
    is_public: false,
    access_control: [],
    metadata: {
      ...(dataSource.description && { description: dataSource.description }),
      entityType: "data_source",
    },
  };
}
