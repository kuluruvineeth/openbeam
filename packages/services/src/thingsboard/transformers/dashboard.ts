import type {
  ThingsboardDashboard,
  ThingsboardTransformContext,
} from "@openbeam/types/services/connectors/thingsboard";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildDashboardContent(dashboard: ThingsboardDashboard): string {
  const parts: string[] = [];

  parts.push(`Title: ${dashboard.title}`);

  if (dashboard.assignedCustomers && dashboard.assignedCustomers.length > 0) {
    const customerIds = dashboard.assignedCustomers.map((c) => c.customerId.id);
    parts.push(`Assigned Customers: ${customerIds.join(", ")}`);
  }

  return parts.join("\n");
}

function buildDashboardMetadata(
  dashboard: ThingsboardDashboard
): GenericDocument["metadata"] {
  return {
    dashboardId: dashboard.id.id,
    ...(dashboard.assignedCustomers &&
      dashboard.assignedCustomers.length > 0 && {
        assignedCustomers: JSON.stringify(
          dashboard.assignedCustomers.map((c) => c.customerId.id)
        ),
      }),
  };
}

export async function transformDashboard(
  dashboard: ThingsboardDashboard,
  context: ThingsboardTransformContext
): Promise<GenericDocument> {
  const title = dashboard.title;
  const content = buildDashboardContent(dashboard);
  const metadata = buildDashboardMetadata(dashboard);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = dashboard.createdTime ?? Date.now();

  return {
    id: `${context.connectorId}_dashboard_${dashboard.id.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: dashboard.id.id,
    document_type: "dashboard",
    document_subtype: "iot_dashboard",
    title,
    content,
    created_at: createdAt,
    updated_at: createdAt,
    source_type: "thingsboard",
    source_name: "ThingsBoard",
    url: `${context.baseUrl}/dashboards/${dashboard.id.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDashboards(
  dashboards: ThingsboardDashboard[],
  context: ThingsboardTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(
    dashboards.map((dashboard) => transformDashboard(dashboard, context))
  );
}
