import type { InsidedClient } from "../client";
import type { InsidedCategory, InsidedUser } from "./posts";

export interface InsidedArticle {
  id: string;
  title: string;
  content: string;
  content_html?: string;
  author: InsidedUser;
  category: InsidedCategory;
  status: string;
  view_count: number;
  helpful_count: number;
  url: string;
  created_at: string;
  updated_at: string;
}

interface ArticlesResponse {
  data: InsidedArticle[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

interface ListArticlesOptions {
  updatedSince?: string;
}

export async function* listArticles(
  client: InsidedClient,
  options: ListArticlesOptions = {}
): AsyncGenerator<InsidedArticle[], void, undefined> {
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

    const response = await client.get<ArticlesResponse>("/articles", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (page >= response.meta.total_pages) {
      break;
    }
    page += 1;
  }
}
