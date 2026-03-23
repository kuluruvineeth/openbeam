import type { FreshserviceTransformContext } from "@openbeam/types/services/connectors/freshservice";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

const STATUS_MAP: Record<number, string> = {
  2: "Open",
  3: "Pending",
  4: "Resolved",
  5: "Closed",
};

const PRIORITY_MAP: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

export interface FreshserviceTicket {
  id: number;
  subject: string;
  description_text?: string;
  status: number;
  priority: number;
  type?: string;
  requester_id?: number;
  responder_id?: number;
  group_id?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  due_by?: string;
  fr_due_by?: string;
  category?: string;
  sub_category?: string;
  item_category?: string;
  source?: number;
  requester?: { name?: string; email?: string };
  stats?: {
    agent_responded_at?: string;
    resolved_at?: string;
    closed_at?: string;
  };
}

function buildTicketContent(ticket: FreshserviceTicket): string {
  const parts: string[] = [];

  if (ticket.description_text) {
    parts.push(ticket.description_text);
  }

  parts.push(`Status: ${STATUS_MAP[ticket.status] ?? String(ticket.status)}`);
  parts.push(
    `Priority: ${PRIORITY_MAP[ticket.priority] ?? String(ticket.priority)}`
  );

  if (ticket.type) {
    parts.push(`Type: ${ticket.type}`);
  }

  if (ticket.category) {
    parts.push(`Category: ${ticket.category}`);
  }

  if (ticket.sub_category) {
    parts.push(`Sub-category: ${ticket.sub_category}`);
  }

  if (ticket.requester?.name) {
    parts.push(`Requester: ${ticket.requester.name}`);
  }

  if (ticket.tags?.length) {
    parts.push(`Tags: ${ticket.tags.join(", ")}`);
  }

  return parts.join("\n");
}

function buildTicketMetadata(
  ticket: FreshserviceTicket
): GenericDocument["metadata"] {
  return {
    ticketId: ticket.id,
    status: STATUS_MAP[ticket.status] ?? String(ticket.status),
    priority: PRIORITY_MAP[ticket.priority] ?? String(ticket.priority),
    ...(ticket.type && { type: ticket.type }),
    ...(ticket.category && { category: ticket.category }),
    ...(ticket.sub_category && { subCategory: ticket.sub_category }),
    ...(ticket.requester?.name && { requesterName: ticket.requester.name }),
    ...(ticket.requester?.email && { requesterEmail: ticket.requester.email }),
    ...(ticket.tags?.length && { tags: ticket.tags.join(", ") }),
    ...(ticket.group_id && { groupId: ticket.group_id }),
    ...(ticket.due_by && { dueBy: ticket.due_by }),
  };
}

export async function transformTicket(
  ticket: FreshserviceTicket,
  context: FreshserviceTransformContext
): Promise<GenericDocument> {
  const title = `[#${ticket.id}] ${ticket.subject}`;
  const content = buildTicketContent(ticket);
  const metadata = buildTicketMetadata(ticket);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

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
    document_subtype: PRIORITY_MAP[ticket.priority] ?? "unknown",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "freshservice",
    source_name: context.domain,
    url: `https://${context.domain}.freshservice.com/helpdesk/tickets/${ticket.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: ticket.requester?.name,
  };
}
