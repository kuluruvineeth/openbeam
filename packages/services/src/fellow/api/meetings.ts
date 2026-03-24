import type { FellowClient } from "../client";

export interface FellowAttendee {
  email: string;
  name?: string;
  role?: string;
}

export interface FellowMeetingNote {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface FellowMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: FellowAttendee[];
  notes: FellowMeetingNote[];
  url: string;
  created_at: string;
  updated_at: string;
}

interface MeetingsResponse {
  results: FellowMeeting[];
  next_cursor?: string;
}

interface ListMeetingsOptions {
  updatedAfter?: string;
}

export async function* listMeetings(
  client: FellowClient,
  options: ListMeetingsOptions = {}
): AsyncGenerator<FellowMeeting[], void, undefined> {
  let cursor: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      limit: "100",
    };

    if (cursor) {
      params.cursor = cursor;
    }

    if (options.updatedAfter) {
      params.updated_after = options.updatedAfter;
    }

    const response = await client.get<MeetingsResponse>("/meetings", params);

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next_cursor) {
      break;
    }
    cursor = response.next_cursor;
  }
}

export function getMeeting(
  client: FellowClient,
  meetingId: string
): Promise<FellowMeeting> {
  return client.get<FellowMeeting>(`/meetings/${meetingId}`);
}
