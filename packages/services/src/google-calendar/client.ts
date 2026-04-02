import { logger } from "../lib/logger";
import { GoogleCalendarApiError } from "./types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type GoogleCalendarClientConfig = {
  connectorId: string;
  accessToken: string;
};

type GoogleErrorBody = {
  error?: {
    message?: string;
    code?: number;
    errors?: Array<{ reason?: string }>;
  };
};

export type CalendarListEntry = {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
  accessRole: string;
};

export type CalendarEvent = {
  id: string;
  status: string;
  htmlLink: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  created: string;
  updated: string;
  creator?: { email?: string; displayName?: string };
  organizer?: { email?: string; displayName?: string };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  recurringEventId?: string;
  iCalUID?: string;
  transparency?: string;
  visibility?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri?: string; entryPointType?: string }>;
  };
};

type EventsListResponse = {
  items: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

type CalendarListResponse = {
  items: CalendarListEntry[];
  nextPageToken?: string;
};

export type GoogleCalendarClient = {
  readonly connectorId: string;
  listCalendars(): AsyncGenerator<CalendarListEntry[], void, undefined>;
  listEvents(
    calendarId: string,
    params?: {
      syncToken?: string;
      timeMin?: string;
      showDeleted?: boolean;
      singleEvents?: boolean;
      maxResults?: number;
    }
  ): AsyncGenerator<
    { events: CalendarEvent[]; nextSyncToken?: string },
    void,
    undefined
  >;
  createEvent(
    calendarId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent>;
  updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
};

export function createGoogleCalendarClient(
  config: GoogleCalendarClientConfig
): GoogleCalendarClient {
  const { connectorId, accessToken } = config;

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${CALENDAR_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  async function request<T>(url: string, attempt = 0): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Google Calendar API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, attempt + 1);
      }
      throw new GoogleCalendarApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMIT_EXCEEDED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 410) {
      throw new GoogleCalendarApiError({
        message: "Sync token expired",
        statusCode: 410,
        code: "SYNC_TOKEN_EXPIRED",
        retryable: false,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as GoogleErrorBody;
      throw new GoogleCalendarApiError({
        message: body.error?.message ?? "Authentication failed",
        statusCode: response.status,
        code: body.error?.errors?.[0]?.reason ?? "AUTH_ERROR",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GoogleErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Google Calendar API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, attempt + 1);
      }
      throw new GoogleCalendarApiError({
        message: body.error?.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: body.error?.errors?.[0]?.reason ?? "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function* listCalendars(): AsyncGenerator<
    CalendarListEntry[],
    void,
    undefined
  > {
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        maxResults: "250",
        minAccessRole: "reader",
      };
      if (pageToken) {
        params.pageToken = pageToken;
      }

      const result = await request<CalendarListResponse>(
        buildUrl("/users/me/calendarList", params)
      );

      if (result.items.length > 0) {
        yield result.items;
      }

      pageToken = result.nextPageToken;
    } while (pageToken);
  }

  async function* listEvents(
    calendarId: string,
    options?: {
      syncToken?: string;
      timeMin?: string;
      showDeleted?: boolean;
      singleEvents?: boolean;
      maxResults?: number;
    }
  ): AsyncGenerator<
    { events: CalendarEvent[]; nextSyncToken?: string },
    void,
    undefined
  > {
    const params: Record<string, string> = {
      maxResults: String(options?.maxResults ?? 250),
    };

    if (options?.syncToken) {
      params.syncToken = options.syncToken;
      if (options.showDeleted) {
        params.showDeleted = "true";
      }
    } else {
      params.singleEvents = String(options?.singleEvents ?? true);
      if (options?.timeMin) {
        params.timeMin = options.timeMin;
      }
      if (options?.showDeleted) {
        params.showDeleted = "true";
      }
      params.orderBy = "startTime";
    }

    let pageToken: string | undefined;

    do {
      if (pageToken) {
        params.pageToken = pageToken;
      }

      const encodedCalendarId = encodeURIComponent(calendarId);
      const result = await request<EventsListResponse>(
        buildUrl(`/calendars/${encodedCalendarId}/events`, params)
      );

      yield {
        events: result.items ?? [],
        nextSyncToken: result.nextSyncToken,
      };

      pageToken = result.nextPageToken;
    } while (pageToken);
  }

  async function mutate<T>(
    url: string,
    method: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new GoogleCalendarApiError({
        message:
          errBody.error?.message ?? `${method} failed: ${response.status}`,
        statusCode: response.status,
        code: "MUTATION_ERROR",
        retryable: response.status >= 500,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  function createEvent(
    calendarId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    return mutate<CalendarEvent>(
      buildUrl(`/calendars/${encodedCalendarId}/events`),
      "POST",
      event
    );
  }

  function updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(eventId);
    return mutate<CalendarEvent>(
      buildUrl(`/calendars/${encodedCalendarId}/events/${encodedEventId}`),
      "PATCH",
      event
    );
  }

  async function deleteEvent(
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(eventId);
    await mutate<void>(
      buildUrl(`/calendars/${encodedCalendarId}/events/${encodedEventId}`),
      "DELETE"
    );
  }

  return {
    connectorId,
    listCalendars,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
