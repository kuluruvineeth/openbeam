export interface FreshserviceTicketCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface FreshserviceTicketUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface FreshserviceTicketNoteResult {
  id: string | undefined;
}

export interface FreshserviceTicketReplyResult {
  id: string | undefined;
}

export interface FreshserviceActionResults {
  ticket_create: FreshserviceTicketCreateResult;
  ticket_update: FreshserviceTicketUpdateResult;
  ticket_note: FreshserviceTicketNoteResult;
  ticket_reply: FreshserviceTicketReplyResult;
}
