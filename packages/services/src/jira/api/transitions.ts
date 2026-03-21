import type { AtlassianClient } from "../../atlassian/client";

export type JiraTransition = {
  id: string;
  name: string;
  to: { id: string; name: string; statusCategory: { name: string } };
};

type TransitionsResponse = {
  transitions: JiraTransition[];
};

export async function listTransitions(
  client: AtlassianClient,
  issueIdOrKey: string
): Promise<JiraTransition[]> {
  const result = await client.get<TransitionsResponse>(
    `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/transitions`
  );
  return result.transitions;
}

export async function transitionIssue(
  client: AtlassianClient,
  issueIdOrKey: string,
  transitionId: string
): Promise<void> {
  await client.post(
    `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/transitions`,
    { transition: { id: transitionId } }
  );
}
