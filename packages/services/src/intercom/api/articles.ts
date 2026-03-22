import type { IntercomClient } from "../client";

export type IntercomArticle = {
  type: string;
  id: string;
  title: string;
  description: string | null;
  body: string | null;
  state: string;
  author_id: number;
  created_at: number;
  updated_at: number;
  url: string | null;
  parent_id: number | null;
  parent_type: string | null;
};

type ArticleListResponse = {
  type: string;
  data: IntercomArticle[];
};

export async function* getAllArticles(
  client: IntercomClient
): AsyncGenerator<IntercomArticle[], void, undefined> {
  for await (const page of client.paginateList<ArticleListResponse>(
    "/articles",
    { per_page: "50" }
  )) {
    if (page.data.length > 0) {
      yield page.data;
    }
  }
}

export function createArticle(
  client: IntercomClient,
  article: {
    title: string;
    body?: string;
    description?: string;
    state?: string;
    author_id?: number;
    parent_id?: number;
    parent_type?: string;
  }
): Promise<IntercomArticle> {
  return client.post<IntercomArticle>("/articles", article);
}
