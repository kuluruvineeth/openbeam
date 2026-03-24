import type { AmplitudeTransformContext } from "@openbeam/types/services/connectors/amplitude";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AmplitudeDashboard } from "../api/dashboards";
import { buildAmplitudeDashboardUrl } from "./utils";

function buildDashboardContent(dashboard: AmplitudeDashboard): string {
  const parts: string[] = [];

  if (dashboard.description) {
    parts.push(dashboard.description);
  }

  if (dashboard.owner) {
    parts.push(`Creator: ${dashboard.owner}`);
  }

  if (dashboard.isPublic !== undefined) {
    parts.push(`Sharing: ${dashboard.isPublic ? "Public" : "Private"}`);
  }

  if (dashboard.charts?.length) {
    const chartNames = dashboard.charts
      .map((c) => c.name ?? `Chart #${c.chartId}`)
      .join(", ");
    parts.push(`Charts: ${chartNames}`);
    parts.push(`Chart Count: ${dashboard.charts.length}`);
  }

  if (dashboard.projectId) {
    parts.push(`Project ID: ${dashboard.projectId}`);
  }

  return parts.join("\n");
}

function buildDashboardMetadata(
  dashboard: AmplitudeDashboard
): GenericDocument["metadata"] {
  return {
    dashboardId: String(dashboard.id),
    ...(dashboard.owner && { owner: dashboard.owner }),
    ...(dashboard.isPublic !== undefined && { isPublic: dashboard.isPublic }),
    ...(dashboard.charts?.length && {
      chartCount: dashboard.charts.length,
    }),
    ...(dashboard.projectId && { projectId: String(dashboard.projectId) }),
  };
}

export async function transformDashboard(
  dashboard: AmplitudeDashboard,
  context: AmplitudeTransformContext
): Promise<GenericDocument> {
  const title = dashboard.name;
  const content = buildDashboardContent(dashboard);
  const metadata = buildDashboardMetadata(dashboard);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = dashboard.createdAt
    ? new Date(dashboard.createdAt).getTime()
    : Date.now();
  const updatedAt = dashboard.lastModified
    ? new Date(dashboard.lastModified).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_dashboard_${dashboard.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(dashboard.id),
    document_type: "dashboard",
    document_subtype: "analytics",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "amplitude",
    url: buildAmplitudeDashboardUrl(context.orgSlug, dashboard.id),
    is_public: dashboard.isPublic ?? false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: dashboard.owner,
  };
}
