import type { FreshserviceClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateTicketParams {
  domain: string;
  email: string;
  subject: string;
  description?: string;
  priority?: number;
  status?: number;
  type?: string;
}

interface UpdateTicketParams {
  domain: string;
  ticketId: number;
  status?: number;
  priority?: number;
  subject?: string;
  description?: string;
}

interface AddNoteParams {
  ticketId: number;
  body: string;
  private?: boolean;
}

interface ReplyParams {
  ticketId: number;
  body: string;
}

export async function createTicket(
  client: FreshserviceClient,
  params: CreateTicketParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      ticket: { id: number };
    }>("/tickets", {
      email: params.email,
      subject: params.subject,
      description: params.description ?? params.subject,
      priority: params.priority ?? 1,
      status: params.status ?? 2,
      ...(params.type && { type: params.type }),
    });

    return {
      success: true,
      id: String(response.ticket.id),
      url: `https://${params.domain}.freshservice.com/helpdesk/tickets/${response.ticket.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ticket",
    };
  }
}

export async function updateTicket(
  client: FreshserviceClient,
  params: UpdateTicketParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {};
    if (params.status !== undefined) {
      body.status = params.status;
    }
    if (params.priority !== undefined) {
      body.priority = params.priority;
    }
    if (params.subject !== undefined) {
      body.subject = params.subject;
    }
    if (params.description !== undefined) {
      body.description = params.description;
    }

    await client.put<{ ticket: { id: number } }>(
      `/tickets/${params.ticketId}`,
      body
    );

    return {
      success: true,
      id: String(params.ticketId),
      url: `https://${params.domain}.freshservice.com/helpdesk/tickets/${params.ticketId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update ticket",
    };
  }
}

export async function addTicketNote(
  client: FreshserviceClient,
  params: AddNoteParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      conversation: { id: number };
    }>(`/tickets/${params.ticketId}/notes`, {
      body: params.body,
      private: params.private ?? true,
    });

    return {
      success: true,
      id: String(response.conversation.id),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add note",
    };
  }
}

export async function replyToTicket(
  client: FreshserviceClient,
  params: ReplyParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      conversation: { id: number };
    }>(`/tickets/${params.ticketId}/reply`, {
      body: params.body,
    });

    return {
      success: true,
      id: String(response.conversation.id),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reply",
    };
  }
}
