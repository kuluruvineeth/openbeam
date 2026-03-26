import type { ProcoreTransformContext } from "@openbeam/types/services/connectors/procore";
import type { GenericDocument } from "@openbeam/vespa";
import type { ProcoreSubmittal } from "../api/submittals";
import { buildProcoreUrl, stripHtml } from "./utils";

export function transformProcoreSubmittal(
  submittal: ProcoreSubmittal,
  projectId: number,
  context: ProcoreTransformContext
): GenericDocument {
  const parts = [
    submittal.description ? stripHtml(submittal.description) : null,
    submittal.status ? `Status: ${submittal.status.name}` : null,
    submittal.submittal_type ? `Type: ${submittal.submittal_type}` : null,
    submittal.spec_section ? `Spec: ${submittal.spec_section.label}` : null,
    submittal.received_from ? `From: ${submittal.received_from.name}` : null,
    submittal.due_date ? `Due: ${submittal.due_date}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(submittal.created_at).getTime();
  const updatedAt = new Date(submittal.updated_at).getTime();

  return {
    id: `${context.connectorId}_submittal_${submittal.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(submittal.id),
    document_type: "submittal",
    document_subtype: submittal.status?.name,
    title: `Submittal #${submittal.number}: ${submittal.title}`,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildProcoreUrl(projectId, "submittals", submittal.id),
    author_name: submittal.created_by?.name,
    is_public: false,
    access_control: [],
    metadata: {
      submittalNumber: String(submittal.number),
      revision: String(submittal.revision),
      ...(submittal.status && { status: submittal.status.name }),
      ...(submittal.submittal_type && { type: submittal.submittal_type }),
      ...(submittal.spec_section && {
        specSection: submittal.spec_section.label,
      }),
      ...(submittal.received_from && {
        receivedFrom: submittal.received_from.name,
      }),
      ...(submittal.responsible_contractor && {
        responsibleContractor: submittal.responsible_contractor.name,
      }),
      projectId: String(projectId),
    },
  };
}
