import type { ProcoreTransformContext } from "@openbeam/types/services/connectors/procore";
import type { GenericDocument } from "@openbeam/vespa";
import type { ProcoreRfi } from "../api/rfis";
import { buildProcoreUrl, stripHtml } from "./utils";

export function transformProcoreRfi(
  rfi: ProcoreRfi,
  projectId: number,
  context: ProcoreTransformContext
): GenericDocument {
  const questionText =
    rfi.question?.plain_text_body ??
    (rfi.question?.body ? stripHtml(rfi.question.body) : null);

  const parts = [
    questionText ? `Question: ${questionText}` : null,
    rfi.official_response
      ? `Answer: ${stripHtml(rfi.official_response)}`
      : null,
    rfi.status ? `Status: ${rfi.status}` : null,
    rfi.priority ? `Priority: ${rfi.priority}` : null,
    rfi.due_date ? `Due: ${rfi.due_date}` : null,
    rfi.assignee ? `Assignee: ${rfi.assignee.name}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(rfi.created_at).getTime();
  const updatedAt = new Date(rfi.updated_at).getTime();

  return {
    id: `${context.connectorId}_rfi_${rfi.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(rfi.id),
    document_type: "rfi",
    document_subtype: rfi.status,
    title: `RFI #${rfi.number}: ${rfi.subject}`,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildProcoreUrl(projectId, "rfis", rfi.id),
    author_name: rfi.created_by?.name,
    is_public: false,
    access_control: [],
    metadata: {
      rfiNumber: String(rfi.number),
      ...(rfi.status && { status: rfi.status }),
      ...(rfi.priority && { priority: rfi.priority }),
      ...(rfi.assignee && { assignee: rfi.assignee.name }),
      ...(rfi.responsible_contractor && {
        responsibleContractor: rfi.responsible_contractor.name,
      }),
      ...(rfi.spec_section && { specSection: rfi.spec_section.label }),
      ...(rfi.cost_code && { costCode: rfi.cost_code.name }),
      projectId: String(projectId),
    },
  };
}
