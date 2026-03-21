import type { ZendeskTransformContext } from "@openbeam/types/services/connectors/zendesk";
import type { GenericDocument } from "@openbeam/vespa";
import { stripHtml } from "./utils";

export type ZendeskTicket = {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string | null;
  type: string | null;
  tags: string[];
  assignee_id: number | null;
  requester_id: number | null;
  group_id: number | null;
  created_at: string;
  updated_at: string;
};

export function transformZendeskTicket(
  ticket: ZendeskTicket,
  context: ZendeskTransformContext,
  userLookup?: Map<number, { name: string; email: string }>
): GenericDocument {
  const description = ticket.description ? stripHtml(ticket.description) : "";

  const parts = [
    `Status: ${ticket.status}`,
    ticket.priority ? `Priority: ${ticket.priority}` : null,
    description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const requester = ticket.requester_id
    ? userLookup?.get(ticket.requester_id)
    : undefined;
  const assignee = ticket.assignee_id
    ? userLookup?.get(ticket.assignee_id)
    : undefined;

  const createdAt = new Date(ticket.created_at).getTime();
  const updatedAt = new Date(ticket.updated_at).getTime();

  return {
    id: `${context.connectorId}_ticket_${ticket.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(ticket.id),
    document_type: "ticket",
    document_subtype: (ticket.type ?? "ticket").toLowerCase(),
    title: ticket.subject ?? `Ticket #${ticket.id}`,
    content,
    author_name: requester?.name ?? assignee?.name,
    author_email: requester?.email ?? assignee?.email,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `https://${context.subdomain}.zendesk.com/agent/tickets/${ticket.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      status: ticket.status,
      ...(ticket.priority && { priority: ticket.priority }),
      ...(ticket.type && { ticketType: ticket.type }),
      ...(ticket.tags.length > 0 && { tags: ticket.tags.join(", ") }),
      ...(assignee?.name && { assignee: assignee.name }),
      ...(requester?.name && { requester: requester.name }),
    },
  };
}
