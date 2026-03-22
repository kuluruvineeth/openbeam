import type { ZoomRecording } from "@openbeam/types/services/connectors/zoom";
import type { ZoomClient } from "../client";

type RecordingsListResponse = {
  meetings: ZoomRecording[];
  next_page_token?: string;
  page_size?: number;
  total_records?: number;
};

const MAX_DATE_RANGE_DAYS = 30;

export async function* getUserRecordings(
  client: ZoomClient,
  userId: string,
  fromDate: string,
  toDate: string
): AsyncGenerator<ZoomRecording[], void, undefined> {
  const ranges = splitDateRange(fromDate, toDate, MAX_DATE_RANGE_DAYS);

  for (const range of ranges) {
    for await (const page of client.paginate<RecordingsListResponse>(
      `/users/${userId}/recordings`,
      {
        page_size: "300",
        from: range.from,
        to: range.to,
      }
    )) {
      const recordings = page.meetings ?? [];
      if (recordings.length > 0) {
        yield recordings;
      }
    }
  }
}

export function downloadTranscriptVtt(
  client: ZoomClient,
  downloadUrl: string
): Promise<string> {
  return client.downloadText(downloadUrl);
}

function splitDateRange(
  from: string,
  to: string,
  maxDays: number
): Array<{ from: string; to: string }> {
  const ranges: Array<{ from: string; to: string }> = [];
  let current = new Date(from);
  const end = new Date(to);

  while (current < end) {
    const rangeEnd = new Date(current);
    rangeEnd.setDate(rangeEnd.getDate() + maxDays);
    if (rangeEnd > end) {
      rangeEnd.setTime(end.getTime());
    }

    ranges.push({
      from: formatDate(current),
      to: formatDate(rangeEnd),
    });

    current = new Date(rangeEnd);
    current.setDate(current.getDate() + 1);
  }

  if (ranges.length === 0) {
    ranges.push({ from, to });
  }

  return ranges;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
