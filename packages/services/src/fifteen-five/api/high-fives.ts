import type { FifteenFiveClient } from "../client";

export interface FifteenFiveHighFive {
  id: number;
  sender: number;
  receiver: number;
  text: string;
  created: string;
}

interface HighFivesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FifteenFiveHighFive[];
}

interface ListHighFivesOptions {
  createdAfter?: string;
}

export async function* listHighFives(
  client: FifteenFiveClient,
  options: ListHighFivesOptions = {}
): AsyncGenerator<FifteenFiveHighFive[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      page_size: "100",
    };

    if (options.createdAfter) {
      params.created_after = options.createdAfter;
    }

    const response = await client.get<HighFivesResponse>("/high-five/", params);

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next) {
      break;
    }
    page += 1;
  }
}
