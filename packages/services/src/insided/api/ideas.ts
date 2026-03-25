import type { InsidedClient } from "../client";
import type { InsidedCategory, InsidedUser } from "./posts";

export interface InsidedIdea {
  id: string;
  title: string;
  content: string;
  content_html?: string;
  author: InsidedUser;
  category: InsidedCategory;
  status: string;
  vote_count: number;
  comment_count: number;
  url: string;
  created_at: string;
  updated_at: string;
}

interface IdeasResponse {
  data: InsidedIdea[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

interface ListIdeasOptions {
  updatedSince?: string;
}

export async function* listIdeas(
  client: InsidedClient,
  options: ListIdeasOptions = {}
): AsyncGenerator<InsidedIdea[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
      sort: "updated_at",
      order: "desc",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<IdeasResponse>("/ideas", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (page >= response.meta.total_pages) {
      break;
    }
    page += 1;
  }
}
