export interface GoogleCalendarEventCreateResult {
  eventId: string | undefined;
  url: string | undefined;
}

export interface GoogleCalendarEventUpdateResult {
  eventId: string | undefined;
  url: string | undefined;
}

export interface GoogleCalendarEventDeleteResult {
  deleted: true;
}

export interface GoogleCalendarActionResults {
  event_create: GoogleCalendarEventCreateResult;
  event_update: GoogleCalendarEventUpdateResult;
  event_delete: GoogleCalendarEventDeleteResult;
}
