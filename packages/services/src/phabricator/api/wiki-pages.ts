import type { PhabricatorClient } from "../client";

export interface PhabricatorWikiPage {
  id: number;
  type: string;
  phid: string;
  fields: {
    path: string;
    status: { value: string; name: string };
    dateCreated: number;
    dateModified: number;
    policy: { view: string; edit: string };
  };
  attachments: {
    content?: {
      content: { raw: string };
      title: string;
      authorPHID: string;
    };
  };
}

interface SearchResponse {
  data: PhabricatorWikiPage[];
  maps: Record<string, unknown>;
  query: { queryKey: string | null };
  cursor: { limit: number; after: string | null; before: string | null };
}

interface ListWikiPagesOptions {
  modifiedAfter?: number;
}

export async function* listWikiPages(
  client: PhabricatorClient,
  options: ListWikiPagesOptions = {}
): AsyncGenerator<PhabricatorWikiPage[], void, undefined> {
  let afterCursor: string | null = null;

  while (true) {
    const constraints: Record<string, unknown> = {};
    if (options.modifiedAfter) {
      constraints.modifiedStart = options.modifiedAfter;
    }

    const params: Record<string, unknown> = {
      constraints,
      attachments: { content: true },
      order: "newest",
      limit: 100,
    };

    if (afterCursor) {
      params.after = afterCursor;
    }

    const response = await client.post<SearchResponse>(
      "phriction.document.search",
      params
    );

    if (response.data.length > 0) {
      yield response.data;
    }

    afterCursor = response.cursor.after;
    if (!afterCursor) {
      break;
    }
  }
}
