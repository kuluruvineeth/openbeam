import type { LinearClient } from "../client";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface IssueCreateResult extends ActionResult {
  id?: string;
  identifier?: string;
  url?: string;
}

interface CommentCreateResult extends ActionResult {
  id?: string;
}

interface SearchResult extends ActionResult {
  issues?: Array<{
    id: string;
    identifier: string;
    title: string;
    url: string;
  }>;
  totalCount?: number;
}

export async function createIssue(
  client: LinearClient,
  params: {
    title: string;
    teamId: string;
    description?: string;
    assigneeId?: string;
    priority?: number;
    stateId?: string;
    labelIds?: string[];
    projectId?: string;
    cycleId?: string;
  }
): Promise<IssueCreateResult> {
  try {
    const input: Record<string, unknown> = {
      title: params.title,
      teamId: params.teamId,
    };
    if (params.description) {
      input.description = params.description;
    }
    if (params.assigneeId) {
      input.assigneeId = params.assigneeId;
    }
    if (params.priority !== undefined) {
      input.priority = params.priority;
    }
    if (params.stateId) {
      input.stateId = params.stateId;
    }
    if (params.labelIds?.length) {
      input.labelIds = params.labelIds;
    }
    if (params.projectId) {
      input.projectId = params.projectId;
    }
    if (params.cycleId) {
      input.cycleId = params.cycleId;
    }

    const data = await client.mutation<{
      issueCreate: {
        success: boolean;
        issue?: { id: string; identifier: string; url: string };
      };
    }>(
      `mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) { success issue { id identifier url } }
      }`,
      { input }
    );

    if (!(data.issueCreate.success && data.issueCreate.issue)) {
      return { success: false, error: "Failed to create issue" };
    }
    const { id, identifier, url } = data.issueCreate.issue;
    return { success: true, id, identifier, url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create issue",
    };
  }
}

export async function updateIssue(
  client: LinearClient,
  issueId: string,
  params: {
    title?: string;
    description?: string;
    assigneeId?: string;
    priority?: number;
    stateId?: string;
    cycleId?: string;
    labelIds?: string[];
  }
): Promise<ActionResult> {
  try {
    const input: Record<string, unknown> = {};
    if (params.title) {
      input.title = params.title;
    }
    if (params.description) {
      input.description = params.description;
    }
    if (params.assigneeId) {
      input.assigneeId = params.assigneeId;
    }
    if (params.priority !== undefined) {
      input.priority = params.priority;
    }
    if (params.stateId) {
      input.stateId = params.stateId;
    }
    if (params.cycleId) {
      input.cycleId = params.cycleId;
    }
    if (params.labelIds) {
      input.labelIds = params.labelIds;
    }

    const data = await client.mutation<{
      issueUpdate: { success: boolean };
    }>(
      `mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }`,
      { id: issueId, input }
    );

    return { success: data.issueUpdate.success };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update issue",
    };
  }
}

export async function searchIssues(
  client: LinearClient,
  query: string,
  first = 20
): Promise<SearchResult> {
  try {
    const data = await client.query<{
      searchIssues: {
        nodes: Array<{
          id: string;
          identifier: string;
          title: string;
          url: string;
        }>;
        totalCount: number;
      };
    }>(
      `query($query: String!, $first: Int) {
        searchIssues(term: $query, first: $first) {
          nodes { id identifier title url }
          totalCount
        }
      }`,
      { query, first }
    );

    return {
      success: true,
      issues: data.searchIssues.nodes,
      totalCount: data.searchIssues.totalCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

export async function addComment(
  client: LinearClient,
  issueId: string,
  body: string
): Promise<CommentCreateResult> {
  try {
    const data = await client.mutation<{
      commentCreate: { success: boolean; comment?: { id: string } };
    }>(
      `mutation($input: CommentCreateInput!) {
        commentCreate(input: $input) { success comment { id } }
      }`,
      { input: { issueId, body } }
    );

    if (!(data.commentCreate.success && data.commentCreate.comment)) {
      return { success: false, error: "Failed to add comment" };
    }
    return { success: true, id: data.commentCreate.comment.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}

export async function addLabel(
  client: LinearClient,
  issueId: string,
  labelId: string
): Promise<ActionResult> {
  try {
    const issue = await client.query<{
      issue: { labels: { nodes: Array<{ id: string }> } };
    }>("query($id: String!) { issue(id: $id) { labels { nodes { id } } } }", {
      id: issueId,
    });

    const currentIds = issue.issue.labels.nodes.map((l) => l.id);
    if (currentIds.includes(labelId)) {
      return { success: true };
    }

    const data = await client.mutation<{
      issueUpdate: { success: boolean };
    }>(
      `mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }`,
      { id: issueId, input: { labelIds: [...currentIds, labelId] } }
    );

    return { success: data.issueUpdate.success };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add label",
    };
  }
}
