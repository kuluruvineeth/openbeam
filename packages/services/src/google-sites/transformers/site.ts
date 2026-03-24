import type { GoogleSitesTransformContext } from "@openbeam/types/services/connectors/google-sites";
import type { GenericDocument } from "@openbeam/vespa";
import type { GoogleSiteFile } from "../api/sites";

export function transformGoogleSite(
  site: GoogleSiteFile,
  context: GoogleSitesTransformContext
): GenericDocument {
  const owner = site.owners?.[0];
  const createdAt = new Date(site.createdTime).getTime();
  const updatedAt = new Date(site.modifiedTime).getTime();

  const parts = [
    site.description ?? null,
    owner ? `Owner: ${owner.displayName}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_site_${site.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: site.id,
    document_type: "wiki",
    document_subtype: "site",
    title: site.name,
    content: parts.join(" — "),
    created_at: createdAt,
    updated_at: updatedAt,
    url: site.webViewLink ?? `https://sites.google.com/d/${site.id}`,
    author_name: owner?.displayName,
    author_email: owner?.emailAddress,
    is_public: false,
    access_control: [],
    metadata: {
      ...(site.description && { description: site.description }),
      ...(site.driveId && { driveId: site.driveId }),
      entityType: "site",
    },
  };
}
