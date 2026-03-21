import type { AtlassianClient } from "../../atlassian/client";

export type JiraIssueFields = {
  summary: string;
  description?: string;
  status?: { name: string; id: string };
  issuetype?: { name: string; id: string };
  priority?: { name: string; id: string };
  assignee?: { accountId: string; displayName?: string };
  reporter?: { accountId: string; displayName?: string };
  labels?: string[];
  components?: Array<{ name: string; id: string }>;
  project?: { key: string; name: string; id: string };
  created: string;
  updated: string;
  comment?: { comments: Array<{ id: string; body: string }> };
};

export type JiraIssueResponse = {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
};

type JiraSearchResult = {
  issues: JiraIssueResponse[];
  total: number;
  nextPageToken?: string;
};

export function getIssue(
  client: AtlassianClient,
  issueIdOrKey: string
): Promise<JiraIssueResponse> {
  return client.get<JiraIssueResponse>(
    `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}`,
    { expand: "renderedFields" }
  );
}

export function searchIssues(
  client: AtlassianClient,
  jql: string,
  options?: { maxResults?: number; fields?: string[] }
): Promise<JiraSearchResult> {
  return client.post<JiraSearchResult>("/rest/api/3/search/jql", {
    jql,
    fields: options?.fields ?? [
      "summary",
      "description",
      "status",
      "issuetype",
      "priority",
      "assignee",
      "reporter",
      "labels",
      "project",
      "created",
      "updated",
    ],
    maxResults: options?.maxResults ?? 50,
  });
}
