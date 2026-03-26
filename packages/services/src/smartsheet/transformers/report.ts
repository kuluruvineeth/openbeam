import type { SmartsheetTransformContext } from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartsheetReport } from "../api/reports";
import { formatAccessLevel } from "./utils";

function buildReportContent(report: SmartsheetReport): string {
  const parts: string[] = [];

  parts.push(`Access: ${formatAccessLevel(report.accessLevel)}`);

  if (report.owner) {
    parts.push(`Owner: ${report.owner}`);
  }

  if (report.totalRowCount !== undefined) {
    parts.push(`Total rows: ${report.totalRowCount}`);
  }

  if (report.sourceSheets?.length) {
    parts.push(
      `Source sheets: ${report.sourceSheets.map((s) => s.name).join(", ")}`
    );
  }

  return parts.join("\n");
}

function buildReportMetadata(
  report: SmartsheetReport
): GenericDocument["metadata"] {
  return {
    reportId: String(report.id),
    accessLevel: report.accessLevel,
    ...(report.owner && { owner: report.owner }),
    ...(report.totalRowCount !== undefined && {
      rowCount: report.totalRowCount,
    }),
    ...(report.sourceSheets?.length && {
      sourceSheetCount: report.sourceSheets.length,
      sourceSheets: report.sourceSheets.map((s) => s.name).join(", "),
    }),
  };
}

export async function transformReport(
  report: SmartsheetReport,
  context: SmartsheetTransformContext
): Promise<GenericDocument> {
  const title = report.name;
  const content = buildReportContent(report);
  const metadata = buildReportMetadata(report);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(report.createdAt).getTime();
  const updatedAt = new Date(report.modifiedAt).getTime();

  return {
    id: `${context.connectorId}_report_${report.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(report.id),
    document_type: "report",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "smartsheet",
    url: report.permalink,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: report.owner,
  };
}
