import type { FifteenFiveClient } from "../client";

export interface FifteenFiveKeyResult {
  id: number;
  name: string;
  description: string | null;
  objective: number;
  owner: number | null;
  target_value: number | null;
  current_value: number | null;
  status: string | null;
  is_closed: boolean;
  created: string;
  modified: string;
}

interface KeyResultsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FifteenFiveKeyResult[];
}

interface ListKeyResultsOptions {
  modifiedAfter?: string;
}

export async function* listKeyResults(
  client: FifteenFiveClient,
  options: ListKeyResultsOptions = {}
): AsyncGenerator<FifteenFiveKeyResult[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      page_size: "100",
    };

    if (options.modifiedAfter) {
      params.modified_after = options.modifiedAfter;
    }

    const response = await client.get<KeyResultsResponse>(
      "/key-result/",
      params
    );

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next) {
      break;
    }
    page += 1;
  }
}
