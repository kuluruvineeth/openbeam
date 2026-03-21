import type { ZendeskClient } from "../client";
import type { ZendeskArticle } from "../transformers/article";

type ArticleListResponse = {
  articles: ZendeskArticle[];
};

export async function* getAllArticles(
  client: ZendeskClient
): AsyncGenerator<ZendeskArticle[], void, undefined> {
  for await (const page of client.paginateAll<ArticleListResponse>(
    "/help_center/articles.json",
    { sort_by: "updated_at", sort_order: "asc" }
  )) {
    if (page.articles.length > 0) {
      yield page.articles;
    }
  }
}

export async function* getArticlesUpdatedAfter(
  client: ZendeskClient,
  updatedAfter: string
): AsyncGenerator<ZendeskArticle[], void, undefined> {
  for await (const page of client.paginateAll<ArticleListResponse>(
    "/help_center/articles.json",
    {
      sort_by: "updated_at",
      sort_order: "asc",
      updated_after: updatedAfter,
    }
  )) {
    if (page.articles.length > 0) {
      yield page.articles;
    }
  }
}
