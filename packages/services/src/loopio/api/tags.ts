import type { LoopioClient } from "../client";

export interface LoopioTag {
  id: string;
  name: string;
  entry_count: number;
  created_at: string;
  updated_at: string;
}

interface TagsResponse {
  tags: LoopioTag[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

export async function* listTags(
  client: LoopioClient
): AsyncGenerator<LoopioTag[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
    };

    const response = await client.get<TagsResponse>("/tags", params);

    if (response.tags.length > 0) {
      yield response.tags;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
