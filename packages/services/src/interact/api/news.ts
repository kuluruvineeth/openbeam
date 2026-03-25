import type { InteractClient } from "../client";

export interface InteractNewsArticle {
  Id: string;
  Title: string;
  Content: string;
  Summary?: string;
  Category?: string;
  Tags?: string[];
  Url?: string;
  PublishedDate?: string;
  Author?: {
    Id: string;
    DisplayName: string;
    Email?: string;
  };
  CreatedDate: string;
  ModifiedDate: string;
}

interface NewsResponse {
  value: InteractNewsArticle[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

interface ListNewsOptions {
  modifiedAfter?: string;
}

export async function* listNews(
  client: InteractClient,
  options: ListNewsOptions = {}
): AsyncGenerator<InteractNewsArticle[], void, undefined> {
  let skip = 0;
  const top = 100;

  while (true) {
    const params: Record<string, string> = {
      $skip: String(skip),
      $top: String(top),
      $count: "true",
    };

    if (options.modifiedAfter) {
      params.$filter = `ModifiedDate gt ${options.modifiedAfter}`;
    }

    const response = await client.get<NewsResponse>("/content/news", params);

    if (response.value.length > 0) {
      yield response.value;
    }

    if (response.value.length < top) {
      break;
    }
    skip += top;
  }
}
