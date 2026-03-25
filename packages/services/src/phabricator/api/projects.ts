import type { PhabricatorClient } from "../client";

export interface PhabricatorProject {
  id: number;
  type: string;
  phid: string;
  fields: {
    name: string;
    slug: string | null;
    description: { raw: string };
    subtype: string;
    milestone: number | null;
    depth: number;
    parent: { id: number; phid: string; name: string } | null;
    icon: { key: string; name: string; icon: string };
    color: { key: string; name: string };
    spacePHID: string | null;
    dateCreated: number;
    dateModified: number;
    policy: { view: string; edit: string; join: string };
  };
  attachments: {
    members?: {
      members: { phid: string }[];
    };
  };
}

interface SearchResponse {
  data: PhabricatorProject[];
  maps: Record<string, unknown>;
  query: { queryKey: string | null };
  cursor: { limit: number; after: string | null; before: string | null };
}

interface ListProjectsOptions {
  modifiedAfter?: number;
}

export async function* listProjects(
  client: PhabricatorClient,
  options: ListProjectsOptions = {}
): AsyncGenerator<PhabricatorProject[], void, undefined> {
  let afterCursor: string | null = null;

  while (true) {
    const constraints: Record<string, unknown> = {};
    if (options.modifiedAfter) {
      constraints.modifiedStart = options.modifiedAfter;
    }

    const params: Record<string, unknown> = {
      constraints,
      attachments: { members: true },
      order: "newest",
      limit: 100,
    };

    if (afterCursor) {
      params.after = afterCursor;
    }

    const response = await client.post<SearchResponse>(
      "project.search",
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
