import type { FifteenFiveClient } from "../client";

export interface FifteenFiveCheckIn {
  id: number;
  user: number;
  pulse_score: number | null;
  is_submitted: boolean;
  created: string;
  modified: string;
  report_date: string;
  questions: FifteenFiveCheckInQuestion[];
}

export interface FifteenFiveCheckInQuestion {
  id: number;
  text: string;
  answer_text: string | null;
}

interface CheckInsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FifteenFiveCheckIn[];
}

interface ListCheckInsOptions {
  modifiedAfter?: string;
}

export async function* listCheckIns(
  client: FifteenFiveClient,
  options: ListCheckInsOptions = {}
): AsyncGenerator<FifteenFiveCheckIn[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      page_size: "100",
    };

    if (options.modifiedAfter) {
      params.modified_after = options.modifiedAfter;
    }

    const response = await client.get<CheckInsResponse>("/check-in/", params);

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next) {
      break;
    }
    page += 1;
  }
}
