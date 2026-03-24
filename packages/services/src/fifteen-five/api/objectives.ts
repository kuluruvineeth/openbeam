import type { FifteenFiveClient } from "../client";

export interface FifteenFiveObjective {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  owner: number | null;
  percentage: number | null;
  is_closed: boolean;
  created: string;
  modified: string;
  start_date: string | null;
  end_date: string | null;
  visibility: string | null;
  group: number | null;
}

interface ObjectivesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FifteenFiveObjective[];
}

interface ListObjectivesOptions {
  modifiedAfter?: string;
}

export async function* listObjectives(
  client: FifteenFiveClient,
  options: ListObjectivesOptions = {}
): AsyncGenerator<FifteenFiveObjective[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      page_size: "100",
    };

    if (options.modifiedAfter) {
      params.modified_after = options.modifiedAfter;
    }

    const response = await client.get<ObjectivesResponse>(
      "/objective/",
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
