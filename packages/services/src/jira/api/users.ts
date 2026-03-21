import type { AtlassianClient } from "../../atlassian/client";

export type JiraUser = {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
};

type UserSearchResult = JiraUser[];

export function searchUsers(
  client: AtlassianClient,
  query: string
): Promise<JiraUser[]> {
  return client.get<UserSearchResult>("/rest/api/3/user/search", {
    query,
    maxResults: "20",
  });
}

export function getUser(
  client: AtlassianClient,
  accountId: string
): Promise<JiraUser> {
  return client.get<JiraUser>("/rest/api/3/user", { accountId });
}
