import type { ZoomMeeting } from "@openbeam/types/services/connectors/zoom";
import type { ZoomClient } from "../client";

type MeetingsListResponse = {
  meetings: ZoomMeeting[];
  next_page_token?: string;
  page_size?: number;
  total_records?: number;
};

export async function* getUserPastMeetings(
  client: ZoomClient,
  userId: string,
  fromDate?: string
): AsyncGenerator<ZoomMeeting[], void, undefined> {
  const params: Record<string, string> = {
    page_size: "300",
    type: "past",
  };

  if (fromDate) {
    params.from = fromDate;
  }

  for await (const page of client.paginate<MeetingsListResponse>(
    `/users/${userId}/meetings`,
    params
  )) {
    const meetings = page.meetings ?? [];
    if (meetings.length > 0) {
      yield meetings;
    }
  }
}
