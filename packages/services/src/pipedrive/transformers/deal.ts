import type { PipedriveTransformContext } from "@openbeam/types/services/connectors/pipedrive";
import type { GenericDocument } from "@openbeam/vespa";
import type { PipedriveDeal } from "../api/deals";
import { buildPipedriveUrl } from "./utils";

export function transformPipedriveDeal(
  deal: PipedriveDeal,
  context: PipedriveTransformContext
): GenericDocument {
  const parts = [
    deal.value ? `Value: ${deal.value} ${deal.currency}` : null,
    deal.status ? `Status: ${deal.status}` : null,
    deal.expected_close_date
      ? `Expected close: ${deal.expected_close_date}`
      : null,
    deal.lost_reason ? `Lost reason: ${deal.lost_reason}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(deal.add_time).getTime();
  const updatedAt = new Date(deal.update_time).getTime();

  return {
    id: `${context.connectorId}_deal_${deal.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(deal.id),
    document_type: "deal",
    document_subtype: deal.status,
    title: deal.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildPipedriveUrl(context.companyDomain, "deal", deal.id),
    author_name: deal.user_id?.name,
    author_email: deal.user_id?.email,
    is_public: false,
    access_control: [],
    metadata: {
      ...(deal.value && { value: String(deal.value) }),
      ...(deal.currency && { currency: deal.currency }),
      ...(deal.status && { status: deal.status }),
      ...(deal.expected_close_date && {
        expectedCloseDate: deal.expected_close_date,
      }),
      ...(deal.person_id && { personName: deal.person_id.name }),
      ...(deal.org_id && { organizationName: deal.org_id.name }),
      ...(deal.probability !== null && {
        probability: String(deal.probability),
      }),
      pipelineId: String(deal.pipeline_id),
      stageId: String(deal.stage_id),
    },
  };
}
