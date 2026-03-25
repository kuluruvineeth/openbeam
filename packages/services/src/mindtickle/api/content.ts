import type { MindtickleClient } from "../client";

export interface MindtickleContent {
  id: string;
  title: string;
  description: string;
  content_type: string;
  category: string;
  file_url: string | null;
  file_size: number;
  tags: string[];
  uploaded_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface ContentResponse {
  content: MindtickleContent[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListContentOptions {
  updatedSince?: string;
}

export async function* listContent(
  client: MindtickleClient,
  options: ListContentOptions = {}
): AsyncGenerator<MindtickleContent[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      limit: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<ContentResponse>("/content", params);

    if (response.content.length > 0) {
      yield response.content;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
