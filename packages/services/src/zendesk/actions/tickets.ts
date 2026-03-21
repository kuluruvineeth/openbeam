import {
  addTicketComment as apiAddComment,
  createTicket as apiCreateTicket,
  updateTicket as apiUpdateTicket,
} from "../api/tickets";
import type { ZendeskClient } from "../client";

export interface TicketActionResult {
  success: boolean;
  ticketId?: number;
  url?: string;
  error?: string;
}

export async function createZendeskTicket(
  client: ZendeskClient,
  params: {
    subject: string;
    description?: string;
    priority?: string;
    type?: string;
    tags?: string[];
  }
): Promise<TicketActionResult> {
  try {
    const result = await apiCreateTicket(client, params);
    return {
      success: true,
      ticketId: result.ticket.id,
      url: `https://${client.subdomain}.zendesk.com/agent/tickets/${result.ticket.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ticket",
    };
  }
}

export async function updateZendeskTicket(
  client: ZendeskClient,
  ticketId: number,
  fields: Record<string, unknown>
): Promise<TicketActionResult> {
  try {
    await apiUpdateTicket(client, ticketId, fields);
    return {
      success: true,
      ticketId,
      url: `https://${client.subdomain}.zendesk.com/agent/tickets/${ticketId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update ticket",
    };
  }
}

export async function addZendeskComment(
  client: ZendeskClient,
  ticketId: number,
  body: string,
  isPublic = true
): Promise<TicketActionResult> {
  try {
    await apiAddComment(client, ticketId, body, isPublic);
    return {
      success: true,
      ticketId,
      url: `https://${client.subdomain}.zendesk.com/agent/tickets/${ticketId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
