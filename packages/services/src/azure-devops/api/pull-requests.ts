import type { AzureDevOpsClient } from "../client";

export type AzureDevOpsPullRequest = {
  pullRequestId: number;
  title: string;
  description?: string;
  status: string;
  creationDate: string;
  closedDate?: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus?: string;
  createdBy: {
    id: string;
    displayName: string;
    uniqueName?: string;
  };
  repository: {
    id: string;
    name: string;
    project: { id: string; name: string };
  };
  reviewers?: Array<{
    id: string;
    displayName: string;
    vote: number;
  }>;
  labels?: Array<{ id: string; name: string }>;
};

type PullRequestListResponse = {
  count: number;
  value: AzureDevOpsPullRequest[];
};

const PAGE_SIZE = 100;

export async function* listPullRequests(
  client: AzureDevOpsClient,
  project: string,
  options: { status?: string } = {}
): AsyncGenerator<AzureDevOpsPullRequest[]> {
  let skip = 0;
  const status = options.status ?? "all";

  while (true) {
    const res = await client.get<PullRequestListResponse>(
      `/${encodeURIComponent(project)}/_apis/git/pullrequests`,
      {
        "searchCriteria.status": status,
        $top: String(PAGE_SIZE),
        $skip: String(skip),
      }
    );

    if (res.value.length === 0) {
      break;
    }

    yield res.value;

    if (res.value.length < PAGE_SIZE) {
      break;
    }
    skip += PAGE_SIZE;
  }
}
