import type { SmartsheetTransformContext } from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartsheetDashboard } from "../api/dashboards";
import { formatAccessLevel } from "./utils";

function buildDashboardContent(dashboard: SmartsheetDashboard): string {
  const parts: string[] = [];

  parts.push(`Access: ${formatAccessLevel(dashboard.accessLevel)}`);

  if (dashboard.owner) {
    parts.push(`Owner: ${dashboard.owner}`);
  }

  if (dashboard.widgets?.length) {
    const widgetSummary = dashboard.widgets
      .map((w) => w.title ?? w.type)
      .join(", ");
    parts.push(`Widgets (${dashboard.widgets.length}): ${widgetSummary}`);
  }

  return parts.join("\n");
}

function buildDashboardMetadata(
  dashboard: SmartsheetDashboard
): GenericDocument["metadata"] {
  return {
    dashboardId: String(dashboard.id),
    accessLevel: dashboard.accessLevel,
    ...(dashboard.owner && { owner: dashboard.owner }),
    ...(dashboard.widgets?.length && {
      widgetCount: dashboard.widgets.length,
    }),
  };
}

export async function transformDashboard(
  dashboard: SmartsheetDashboard,
  context: SmartsheetTransformContext
): Promise<GenericDocument> {
  const title = dashboard.name;
  const content = buildDashboardContent(dashboard);
  const metadata = buildDashboardMetadata(dashboard);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(dashboard.createdAt).getTime();
  const updatedAt = new Date(dashboard.modifiedAt).getTime();

  return {
    id: `${context.connectorId}_dashboard_${dashboard.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(dashboard.id),
    document_type: "dashboard",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "smartsheet",
    url: dashboard.permalink,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: dashboard.owner,
  };
}
