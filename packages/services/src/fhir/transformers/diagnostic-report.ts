import type {
  FhirDiagnosticReport,
  FhirTransformContext,
} from "@openplane/types/services/connectors/fhir";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";
import { deidentifyResource } from "../phi/safe-harbor";

function getReportName(report: FhirDiagnosticReport): string {
  return (
    report.code.text ??
    report.code.coding?.[0]?.display ??
    `Diagnostic Report ${report.id}`
  );
}

function buildReportContent(
  report: FhirDiagnosticReport,
  deidentified: Record<string, unknown>
): string {
  const parts: string[] = [];

  parts.push(`Report: ${getReportName(report)}`);
  parts.push(`Status: ${report.status}`);

  const category = report.category?.[0];
  if (category) {
    parts.push(
      `Category: ${category.text ?? category.coding?.[0]?.display ?? ""}`
    );
  }

  if (report.conclusion) {
    parts.push(`Conclusion: ${report.conclusion}`);
  }

  if (report.result?.length) {
    parts.push(`Results: ${report.result.length}`);
  }

  if (report.performer?.length) {
    parts.push(`Performers: ${report.performer.length}`);
  }

  const effectiveDate = deidentified.effectiveDateTime as string | undefined;
  if (effectiveDate) {
    parts.push(`Date: ${effectiveDate}`);
  }

  const issued = deidentified.issued as string | undefined;
  if (issued) {
    parts.push(`Issued: ${issued}`);
  }

  return parts.join("\n");
}

function buildReportMetadata(
  report: FhirDiagnosticReport
): GenericDocument["metadata"] {
  const code = report.code.coding?.[0]?.code;
  const codeSystem = report.code.coding?.[0]?.system;
  const category =
    report.category?.[0]?.text ?? report.category?.[0]?.coding?.[0]?.display;

  return {
    resourceType: "DiagnosticReport",
    fhirId: report.id,
    status: report.status,
    codeDisplay: getReportName(report),
    hasConclusion: !!report.conclusion,
    ...(code != null && { code }),
    ...(codeSystem != null && { codeSystem }),
    ...(category != null && { category }),
    ...(report.result?.length != null && {
      resultCount: report.result.length,
    }),
  };
}

export async function transformDiagnosticReport(
  report: FhirDiagnosticReport,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const { deidentified } = deidentifyResource(
    report,
    context.deidentificationStrategy
  );

  const title = getReportName(report);
  const content = buildReportContent(report, deidentified);
  const metadata = buildReportMetadata(report);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_report_${report.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: report.id,
    document_type: "healthcare_report",
    title,
    content,
    created_at: report.effectiveDateTime
      ? new Date(report.effectiveDateTime).getTime()
      : Date.now(),
    updated_at: report.meta?.lastUpdated
      ? new Date(report.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/DiagnosticReport/${report.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
