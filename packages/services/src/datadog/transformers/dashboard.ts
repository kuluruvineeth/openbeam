import type { DatadogTransformContext } from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { DatadogDashboardSummary, DatadogWidget } from "../api/dashboards";
import { buildDatadogUrl } from "./utils";

function extractWidgetTitles(widgets: DatadogWidget[] | undefined): string[] {
  if (!widgets) {
    return [];
  }
  const titles: string[] = [];

  for (const widget of widgets) {
    if (widget.definition.title) {
      titles.push(widget.definition.title);
    }
    if (widget.definition.widgets) {
      titles.push(...extractWidgetTitles(widget.definition.widgets));
    }
  }

  return titles;
}

function buildDashboardContent(
  dashboard: DatadogDashboardSummary,
  widgetTitles?: string[]
): string {
  const parts: string[] = [];

  if (dashboard.description) {
    parts.push(dashboard.description);
  }

  parts.push(`Layout: ${dashboard.layout_type}`);
  parts.push(`Author: ${dashboard.author_name ?? dashboard.author_handle}`);

  if (widgetTitles && widgetTitles.length > 0) {
    parts.push(`Widgets: ${widgetTitles.join(", ")}`);
  }

  return parts.join("\n");
}

function buildDashboardMetadata(
  dashboard: DatadogDashboardSummary,
  widgetCount?: number
): GenericDocument["metadata"] {
  return {
    dashboardId: dashboard.id,
    layoutType: dashboard.layout_type,
    author: dashboard.author_name ?? dashboard.author_handle,
    isReadOnly: dashboard.is_read_only,
    ...(widgetCount !== undefined && { widgetCount }),
  };
}

export async function transformDashboard(
  dashboard: DatadogDashboardSummary,
  context: DatadogTransformContext,
  widgets?: DatadogWidget[]
): Promise<GenericDocument> {
  const widgetTitles = extractWidgetTitles(widgets);
  const title = dashboard.title;
  const content = buildDashboardContent(dashboard, widgetTitles);
  const metadata = buildDashboardMetadata(dashboard, widgets?.length);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(dashboard.created_at).getTime();
  const updatedAt = new Date(dashboard.modified_at).getTime();

  return {
    id: `${context.connectorId}_dashboard_${dashboard.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: dashboard.id,
    document_type: "dashboard",
    document_subtype: dashboard.layout_type,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "datadog",
    url: buildDatadogUrl(context.site, `/dashboard/${dashboard.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: dashboard.author_name ?? dashboard.author_handle,
  };
}
