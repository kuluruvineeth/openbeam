import type { InteractClient } from "../client";

export interface InteractPage {
  Id: string;
  Title: string;
  Content: string;
  Summary?: string;
  Section?: string;
  Status: string;
  Url?: string;
  Author?: {
    Id: string;
    DisplayName: string;
    Email?: string;
  };
  CreatedDate: string;
  ModifiedDate: string;
}

interface PagesResponse {
  value: InteractPage[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

interface ListPagesOptions {
  modifiedAfter?: string;
}

export async function* listPages(
  client: InteractClient,
  options: ListPagesOptions = {}
): AsyncGenerator<InteractPage[], void, undefined> {
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

    const response = await client.get<PagesResponse>("/content/pages", params);

    if (response.value.length > 0) {
      yield response.value;
    }

    if (response.value.length < top) {
      break;
    }
    skip += top;
  }
}
