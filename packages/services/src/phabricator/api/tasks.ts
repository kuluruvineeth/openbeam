import type { PhabricatorClient } from "../client";

export interface PhabricatorTask {
  id: number;
  type: string;
  phid: string;
  fields: {
    name: string;
    description: { raw: string };
    authorPHID: string;
    ownerPHID: string | null;
    status: { value: string; name: string; color: string | null };
    priority: { value: number; name: string; color: string };
    points: number | null;
    subtype: string;
    spacePHID: string | null;
    dateCreated: number;
    dateModified: number;
    policy: { view: string; interact: string; edit: string };
  };
  attachments: {
    projects?: { projectPHIDs: string[] };
  };
}

interface SearchResponse {
  data: PhabricatorTask[];
  maps: Record<string, unknown>;
  query: { queryKey: string | null };
  cursor: { limit: number; after: string | null; before: string | null };
}

interface ListTasksOptions {
  modifiedAfter?: number;
}

export async function* listTasks(
  client: PhabricatorClient,
  options: ListTasksOptions = {}
): AsyncGenerator<PhabricatorTask[], void, undefined> {
  let afterCursor: string | null = null;

  while (true) {
    const constraints: Record<string, unknown> = {};
    if (options.modifiedAfter) {
      constraints.modifiedStart = options.modifiedAfter;
    }

    const params: Record<string, unknown> = {
      constraints,
      attachments: { projects: true },
      order: "newest",
      limit: 100,
    };

    if (afterCursor) {
      params.after = afterCursor;
    }

    const response = await client.post<SearchResponse>(
      "maniphest.search",
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
