import type { CoupaTransformContext } from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import type { CoupaExpenseReport } from "../api/expense-reports";
import { buildCoupaUrl } from "./utils";

export function transformCoupaExpenseReport(
  report: CoupaExpenseReport,
  context: CoupaTransformContext
): GenericDocument {
  const lineDescriptions = (report["expense-lines"] ?? [])
    .map((l) => {
      const lineParts = [l.description, l.amount, l["expense-date"]].filter(
        Boolean
      );
      return lineParts.join(" - ");
    })
    .filter(Boolean)
    .join("; ");

  const parts = [
    report.status ? `Status: ${report.status}` : null,
    report.total
      ? `Total: ${report.total} ${report.currency?.code ?? ""}`
      : null,
    report["created-by"]?.fullname
      ? `Submitter: ${report["created-by"].fullname}`
      : null,
    report.department ? `Department: ${report.department.name}` : null,
    report["submitted-at"] ? `Submitted: ${report["submitted-at"]}` : null,
    lineDescriptions ? `Expenses: ${lineDescriptions}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_expense_report_${report.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(report.id),
    document_type: "expense_report",
    document_subtype: report.status,
    title: report.title,
    content: parts.join(" — "),
    created_at: new Date(report["created-at"]).getTime(),
    updated_at: new Date(report["updated-at"]).getTime(),
    url: buildCoupaUrl(context.instanceUrl, "expense_reports", report.id),
    author_name: report["created-by"]?.fullname,
    is_public: false,
    access_control: [],
    metadata: {
      ...(report.status && { status: report.status }),
      ...(report.total && { total: report.total }),
      ...(report.currency?.code && { currency: report.currency.code }),
      ...(report.department && { department: report.department.name }),
    },
  };
}
