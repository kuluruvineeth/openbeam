export interface ZendeskTicketCreateResult {
  ticketId: string | undefined;
  url: string | undefined;
}

export interface ZendeskTicketUpdateResult {
  ticketId: string | undefined;
  url: string | undefined;
}

export interface ZendeskTicketCommentResult {
  ticketId: string | undefined;
  url: string | undefined;
}

export interface ZendeskActionResults {
  ticket_create: ZendeskTicketCreateResult;
  ticket_update: ZendeskTicketUpdateResult;
  ticket_comment: ZendeskTicketCommentResult;
}
