import type { SimpplrClient } from "../client";

export interface SimpplrPage {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  siteId?: string;
  siteName?: string;
  status?: string;
  url?: string;
  author?: {
    id: string;
    displayName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PagesResponse {
  data: SimpplrPage[];
  total?: number;
  hasMore?: boolean;
}

interface ListPagesOptions {
  modifiedAfter?: string;
}

export async function* listPages(
  client: SimpplrClient,
  options: ListPagesOptions = {}
): AsyncGenerator<SimpplrPage[], void, undefined> {
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

    const response = await client.get<PagesResponse>("/pages", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (response.data.length < limit) {
      break;
    }
    offset += limit;
  }
}
