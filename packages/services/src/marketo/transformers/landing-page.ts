import type { MarketoTransformContext } from "@openbeam/types/services/connectors/marketo";
import type { GenericDocument } from "@openbeam/vespa";
import type { MarketoLandingPage } from "../api/landing-pages";
import { buildMarketoUrl } from "./utils";

export function transformMarketoLandingPage(
  page: MarketoLandingPage,
  context: MarketoTransformContext
): GenericDocument {
  const parts = [
    page.description ?? null,
    page.title ? `Page Title: ${page.title}` : null,
    page.url ? `URL: ${page.url}` : null,
    page.status ? `Status: ${page.status}` : null,
    page.workspace ? `Workspace: ${page.workspace}` : null,
    page.folder?.folderName ? `Folder: ${page.folder.folderName}` : null,
    page.mobileEnabled ? "Mobile Enabled" : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(page.createdAt).getTime();
  const updatedAt = new Date(page.updatedAt).getTime();

  return {
    id: `${context.connectorId}_landing_page_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(page.id),
    document_type: "landing_page",
    document_subtype: page.status,
    title: page.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: page.url ?? buildMarketoUrl(context.munchkinId, "LP", page.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(page.url && { pageUrl: page.url }),
      ...(page.status && { status: page.status }),
      ...(page.workspace && { workspace: page.workspace }),
      ...(page.title && { pageTitle: page.title }),
      mobileEnabled: String(page.mobileEnabled),
    },
  };
}
