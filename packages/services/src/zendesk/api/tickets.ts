import type { ZendeskClient } from "../client";
import type { ZendeskComment } from "../transformers/comment";
import type { ZendeskTicket } from "../transformers/ticket";

type TicketListResponse = {
  tickets: ZendeskTicket[];
};

type IncrementalTicketResponse = {
  tickets: ZendeskTicket[];
};

type CommentListResponse = {
  comments: ZendeskComment[];
};

type CreateTicketResponse = {
  ticket: { id: number; url: string };
};

export async function* getAllTickets(
  client: ZendeskClient
): AsyncGenerator<ZendeskTicket[], void, undefined> {
  for await (const page of client.paginateAll<TicketListResponse>(
    "/tickets.json"
  )) {
    if (page.tickets.length > 0) {
      yield page.tickets;
    }
  }
}

export async function* getIncrementalTickets(
  client: ZendeskClient,
  startTime: number
): AsyncGenerator<
  { tickets: ZendeskTicket[]; endTime: number; cursor: string },
  void,
  undefined
> {
  for await (const page of client.incrementalCursor<IncrementalTicketResponse>(
    "/incremental/tickets/cursor.json",
    { start_time: String(Math.floor(startTime / 1000)) }
  )) {
    if (page.tickets.length > 0) {
      yield {
        tickets: page.tickets,
        endTime: page.end_time * 1000,
        cursor: page.after_cursor,
      };
    }
  }
}

export async function* getTicketComments(
  client: ZendeskClient,
  ticketId: number
): AsyncGenerator<ZendeskComment[], void, undefined> {
  for await (const page of client.paginateAll<CommentListResponse>(
    `/tickets/${ticketId}/comments.json`
  )) {
    if (page.comments.length > 0) {
      yield page.comments;
    }
  }
}

export function createTicket(
  client: ZendeskClient,
  ticket: {
    subject: string;
    description?: string;
    priority?: string;
    type?: string;
    tags?: string[];
    assignee_id?: number;
  }
): Promise<CreateTicketResponse> {
  return client.post<CreateTicketResponse>("/tickets.json", {
    ticket: {
      subject: ticket.subject,
      comment: ticket.description ? { body: ticket.description } : undefined,
      priority: ticket.priority,
      type: ticket.type,
      tags: ticket.tags,
      assignee_id: ticket.assignee_id,
    },
  });
}

export async function updateTicket(
  client: ZendeskClient,
  ticketId: number,
  fields: Record<string, unknown>
): Promise<void> {
  await client.put(`/tickets/${ticketId}.json`, { ticket: fields });
}

export async function addTicketComment(
  client: ZendeskClient,
  ticketId: number,
  body: string,
  isPublic = true
): Promise<void> {
  await client.put(`/tickets/${ticketId}.json`, {
    ticket: {
      comment: { body, public: isPublic },
    },
  });
}
