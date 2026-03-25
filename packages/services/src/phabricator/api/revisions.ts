import type { PhabricatorClient } from "../client";

export interface PhabricatorRevision {
  id: number;
  type: string;
  phid: string;
  fields: {
    title: string;
    uri: string;
    authorPHID: string;
    status: {
      value: string;
      name: string;
      closed: boolean;
      "color.ansi": string;
    };
    repositoryPHID: string | null;
    diffPHID: string;
    summary: string;
    testPlan: string;
    isDraft: boolean;
    holdAsDraft: boolean;
    dateCreated: number;
    dateModified: number;
    policy: { view: string; edit: string };
  };
  attachments: {
    reviewers?: {
      reviewers: {
        reviewerPHID: string;
        status: string;
        isBlocking: boolean;
      }[];
    };
  };
}

interface SearchResponse {
  data: PhabricatorRevision[];
  maps: Record<string, unknown>;
  query: { queryKey: string | null };
  cursor: { limit: number; after: string | null; before: string | null };
}

interface ListRevisionsOptions {
  modifiedAfter?: number;
}

export async function* listRevisions(
  client: PhabricatorClient,
  options: ListRevisionsOptions = {}
): AsyncGenerator<PhabricatorRevision[], void, undefined> {
  let afterCursor: string | null = null;

  while (true) {
    const constraints: Record<string, unknown> = {};
    if (options.modifiedAfter) {
      constraints.modifiedStart = options.modifiedAfter;
    }

    const params: Record<string, unknown> = {
      constraints,
      attachments: { reviewers: true },
      order: "newest",
      limit: 100,
    };

    if (afterCursor) {
      params.after = afterCursor;
    }

    const response = await client.post<SearchResponse>(
      "differential.revision.search",
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
