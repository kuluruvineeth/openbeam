import type { PhabricatorClient } from "../client";

export interface PhabricatorRepository {
  id: number;
  type: string;
  phid: string;
  fields: {
    name: string;
    vcs: string;
    callsign: string | null;
    shortName: string | null;
    status: string;
    isImporting: boolean;
    spacePHID: string | null;
    dateCreated: number;
    dateModified: number;
    policy: { view: string; edit: string; diffusion: { push: string } };
  };
  attachments: {
    uris?: {
      uris: {
        id: string;
        type: string;
        phid: string;
        fields: {
          uri: {
            raw: string;
            display: string;
            effective: string;
            normalized: string;
          };
          io: { raw: string; default: string; effective: string };
          display: { raw: string; default: string; effective: string };
        };
      }[];
    };
  };
}

interface SearchResponse {
  data: PhabricatorRepository[];
  maps: Record<string, unknown>;
  query: { queryKey: string | null };
  cursor: { limit: number; after: string | null; before: string | null };
}

interface ListRepositoriesOptions {
  modifiedAfter?: number;
}

export async function* listRepositories(
  client: PhabricatorClient,
  options: ListRepositoriesOptions = {}
): AsyncGenerator<PhabricatorRepository[], void, undefined> {
  let afterCursor: string | null = null;

  while (true) {
    const constraints: Record<string, unknown> = {};
    if (options.modifiedAfter) {
      constraints.modifiedStart = options.modifiedAfter;
    }

    const params: Record<string, unknown> = {
      constraints,
      attachments: { uris: true },
      order: "newest",
      limit: 100,
    };

    if (afterCursor) {
      params.after = afterCursor;
    }

    const response = await client.post<SearchResponse>(
      "diffusion.repository.search",
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
