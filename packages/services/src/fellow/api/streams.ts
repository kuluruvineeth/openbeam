import type { FellowClient } from "../client";

export interface FellowStream {
  id: string;
  name: string;
  description?: string;
  url: string;
  created_at: string;
  updated_at: string;
}

interface StreamsResponse {
  results: FellowStream[];
  next_cursor?: string;
}

interface ListStreamsOptions {
  updatedAfter?: string;
}

export async function* listStreams(
  client: FellowClient,
  options: ListStreamsOptions = {}
): AsyncGenerator<FellowStream[], void, undefined> {
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

    const response = await client.get<StreamsResponse>("/streams", params);

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next_cursor) {
      break;
    }
    cursor = response.next_cursor;
  }
}
