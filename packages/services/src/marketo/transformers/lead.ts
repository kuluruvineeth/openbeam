import type { MarketoTransformContext } from "@openbeam/types/services/connectors/marketo";
import type { GenericDocument } from "@openbeam/vespa";
import type { MarketoLead } from "../api/leads";
import { buildMarketoUrl, formatName } from "./utils";

export function transformMarketoLead(
  lead: MarketoLead,
  context: MarketoTransformContext
): GenericDocument {
  const name = formatName(lead.firstName, lead.lastName);

  const parts = [
    lead.email ? `Email: ${lead.email}` : null,
    lead.company ? `Company: ${lead.company}` : null,
    lead.title ? `Title: ${lead.title}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.leadSource ? `Source: ${lead.leadSource}` : null,
    lead.leadStatus ? `Status: ${lead.leadStatus}` : null,
    lead.industry ? `Industry: ${lead.industry}` : null,
    lead.city || lead.state || lead.country
      ? `Location: ${[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}`
      : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(lead.createdAt).getTime();
  const updatedAt = new Date(lead.updatedAt).getTime();

  return {
    id: `${context.connectorId}_lead_${lead.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(lead.id),
    document_type: "lead",
    document_subtype: lead.leadStatus ?? undefined,
    title: name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildMarketoUrl(context.munchkinId, "LE", lead.id),
    author_name: undefined,
    author_email: lead.email ?? undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(lead.email && { email: lead.email }),
      ...(lead.company && { company: lead.company }),
      ...(lead.title && { title: lead.title }),
      ...(lead.leadSource && { leadSource: lead.leadSource }),
      ...(lead.leadStatus && { leadStatus: lead.leadStatus }),
      ...(lead.industry && { industry: lead.industry }),
      ...(lead.country && { country: lead.country }),
    },
  };
}
