import type { SimpplrClient } from "../client";

export interface SimpplrNewsArticle {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  category?: string;
  tags?: string[];
  publishedAt?: string;
  url?: string;
  author?: {
    id: string;
    displayName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NewsResponse {
  data: SimpplrNewsArticle[];
  total?: number;
  hasMore?: boolean;
}

interface ListNewsOptions {
  modifiedAfter?: string;
}

export async function* listNews(
  client: SimpplrClient,
  options: ListNewsOptions = {}
): AsyncGenerator<SimpplrNewsArticle[], void, undefined> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const params: Record<string, string> = {
      offset: String(offset),
      limit: String(limit),
    };

    if (options.modifiedAfter) {
      params.modifiedAfter = options.modifiedAfter;
    }

    const response = await client.get<NewsResponse>("/news", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (response.data.length < limit) {
      break;
    }
    offset += limit;
  }
}
