import type { LinearLabel } from "@openbeam/types/services/connectors/linear";
import type { LinearClient } from "../client";

const LABELS_QUERY = `
  query IssueLabels($first: Int!, $after: String) {
    issueLabels(first: $first, after: $after) {
      nodes {
        id
        name
        color
        description
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface LabelsResponse {
  issueLabels: {
    nodes: LinearLabel[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

const DEFAULT_PAGE_SIZE = 100;

export async function* getAllLabels(
  client: LinearClient,
  pageSize = DEFAULT_PAGE_SIZE
): AsyncGenerator<LinearLabel, void, undefined> {
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const data = await client.query<LabelsResponse>(LABELS_QUERY, {
      first: pageSize,
      after: cursor,
    });

    for (const label of data.issueLabels.nodes) {
      yield label;
    }

    hasMore = data.issueLabels.pageInfo.hasNextPage;
    cursor = data.issueLabels.pageInfo.endCursor ?? undefined;
  }
}

export async function getLabel(
  client: LinearClient,
  labelId: string
): Promise<LinearLabel> {
  const query = `
    query IssueLabel($id: String!) {
      issueLabel(id: $id) {
        id
        name
        color
        description
      }
    }
  `;

  const data = await client.query<{ issueLabel: LinearLabel }>(query, {
    id: labelId,
  });

  return data.issueLabel;
}
