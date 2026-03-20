import type { JiraIssue } from "../transformers/issue";

export type JiraSearchResponse = {
  issues: JiraIssue[];
  total: number;
  nextPageToken?: string;
};
