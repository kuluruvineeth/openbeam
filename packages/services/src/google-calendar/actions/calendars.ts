import type { GoogleCalendarClient } from "../client";

export type CalendarListResult = {
  success: boolean;
  calendars?: Array<{
    id: string;
    summary: string;
    primary: boolean;
    accessRole: string;
    timeZone?: string;
  }>;
  error?: string;
};

export async function listCalendars(
  client: GoogleCalendarClient,
  options: { limit?: number } = {}
): Promise<CalendarListResult> {
  try {
    const limit = Math.max(1, Math.min(options.limit ?? 50, 250));
    const calendars: CalendarListResult["calendars"] = [];
    for await (const page of client.listCalendars()) {
      for (const entry of page) {
        calendars.push({
          id: entry.id,
          summary: entry.summary,
          primary: Boolean(entry.primary),
          accessRole: entry.accessRole,
          timeZone: entry.timeZone,
        });
        if (calendars.length >= limit) {
          return { success: true, calendars };
        }
      }
    }
    return { success: true, calendars };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list calendars",
    };
  }
}
