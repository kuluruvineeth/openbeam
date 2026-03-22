import type { HubSpotTransformContext } from "@openbeam/types/services/connectors/hubspot";
import type { GenericDocument } from "@openbeam/vespa";
import type { HubSpotTicket } from "../api/tickets";
import { stripHtml } from "./utils";

const PORTAL_URL = "https://app.hubspot.com/contacts";

export function transformHubSpotTicket(
  ticket: HubSpotTicket,
  context: HubSpotTransformContext
): GenericDocument {
  const p = ticket.properties;
  const title = p.subject || `Ticket #${ticket.id}`;
  const content = p.content ? stripHtml(p.content) : "";

  const createdAt = new Date(ticket.createdAt).getTime();
  const updatedAt = new Date(ticket.updatedAt).getTime();

  return {
    id: `${context.connectorId}_ticket_${ticket.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: ticket.id,
    document_type: "ticket",
    document_subtype: (p.hs_ticket_priority ?? "ticket").toLowerCase(),
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${PORTAL_URL}/${context.portalId}/ticket/${ticket.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(p.hs_pipeline_stage && { stage: p.hs_pipeline_stage }),
      ...(p.hs_pipeline && { pipeline: p.hs_pipeline }),
      ...(p.hs_ticket_priority && { priority: p.hs_ticket_priority }),
      ...(p.closed_date && { closedDate: p.closed_date }),
    },
  };
}
