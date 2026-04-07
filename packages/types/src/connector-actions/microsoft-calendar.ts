export interface MicrosoftCalendarEventCreateResult {
  eventId: string | undefined;
  url: string | undefined;
}

export interface MicrosoftCalendarEventUpdateResult {
  eventId: string | undefined;
  url: string | undefined;
}

export interface MicrosoftCalendarEventDeleteResult {
  deleted: true;
}

export interface MicrosoftCalendarActionResults {
  event_create: MicrosoftCalendarEventCreateResult;
  event_update: MicrosoftCalendarEventUpdateResult;
  event_delete: MicrosoftCalendarEventDeleteResult;
}
