import type { LookerStudioTransformContext } from "@openbeam/types/services/connectors/looker-studio";
import type { GenericDocument } from "@openbeam/vespa";
import type { LookerStudioReport } from "../api/reports";

export function transformReport(
  report: LookerStudioReport,
  context: LookerStudioTransformContext
): GenericDocument {
  const owner = report.owners?.[0];
  const createdAt = new Date(report.createdTime).getTime();
  const updatedAt = new Date(report.modifiedTime).getTime();

  const parts = [
    report.description ?? null,
    owner ? `Owner: ${owner.displayName}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_report_${report.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: report.id,
    document_type: "report",
    document_subtype: "dashboard",
    title: report.name,
    content: parts.join(" — "),
    created_at: createdAt,
    updated_at: updatedAt,
    url:
      report.webViewLink ??
      `https://lookerstudio.google.com/reporting/${report.id}`,
    author_name: owner?.displayName,
    author_email: owner?.emailAddress,
    is_public: false,
    access_control: [],
    metadata: {
      ...(report.description && { description: report.description }),
      ...(report.starred !== undefined && {
        starred: String(report.starred),
      }),
      entityType: "report",
    },
  };
}
