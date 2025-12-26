import type { LinearClient } from "../client";
import {
  type LinearComment,
  LinearConnectionSchema,
  type LinearIssue,
  LinearIssueSchema,
  type LinearPageInfo,
} from "../types";

const ISSUE_FRAGMENT = `
  fragment IssueFields on Issue {
    id
    identifier
    title
    description
    priority
    priorityLabel
    estimate
    createdAt
    updatedAt
    archivedAt
    canceledAt
    completedAt
    dueDate
    url
    state {
      id
      name
      color
      type
    }
    team {
      id
      name
      key
      description
    }
    assignee {
      id
      name
      email
      avatarUrl
      displayName
      active
    }
    creator {
      id
      name
      email
      avatarUrl
      displayName
      active
    }
    labels {
      nodes {
        id
        name
        color
        description
      }
    }
    parent {
      id
      identifier
    }
    project {
      id
      name
    }
    cycle {
      id
      name
    }
  }
`;

const TEAM_ISSUES_QUERY = `
  ${ISSUE_FRAGMENT}
  query TeamIssues($teamId: String!, $first: Int!, $after: String, $filter: IssueFilter) {
    team(id: $teamId) {
      issues(first: $first, after: $after, filter: $filter, orderBy: updatedAt) {
        nodes {
          ...IssueFields
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`;

const ISSUE_QUERY = `
  ${ISSUE_FRAGMENT}
  query Issue($id: String!) {
    issue(id: $id) {
      ...IssueFields
    }
  }
`;

const ISSUE_COMMENTS_QUERY = `
  query IssueComments($issueId: String!, $first: Int!, $after: String) {
    issue(id: $issueId) {
      comments(first: $first, after: $after) {
        nodes {
          id
          body
          createdAt
          updatedAt
          user {
            id
            name
            email
            avatarUrl
            displayName
            active
          }
          issue {
            id
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`;

interface TeamIssuesResponse {
  team: {
    issues: {
      nodes: LinearIssue[];
      pageInfo: LinearPageInfo;
    };
  };
}

interface IssueResponse {
  issue: LinearIssue;
}

interface IssueCommentsResponse {
  issue: {
    comments: {
      nodes: LinearComment[];
      pageInfo: LinearPageInfo;
    };
  };
}

export interface GetTeamIssuesOptions {
  teamId: string;
  cursor?: string;
  filter?: {
    updatedAt?: { gte: string };
  };
}

export async function getTeamIssues(
  client: LinearClient,
  options: GetTeamIssuesOptions
): Promise<{ issues: LinearIssue[]; nextCursor?: string }> {
  const { teamId, cursor, filter } = options;

  const data = await client.query<TeamIssuesResponse>(TEAM_ISSUES_QUERY, {
    teamId,
    first: 50,
    after: cursor,
    filter,
  });

  const connection = LinearConnectionSchema(LinearIssueSchema).parse(
    data.team.issues
  );

  return {
    issues: connection.nodes,
    nextCursor: connection.pageInfo.hasNextPage
      ? (connection.pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllTeamIssues(
  client: LinearClient,
  teamId: string,
  filter?: { updatedAt?: { gte: string } }
): AsyncGenerator<LinearIssue, void, undefined> {
  let cursor: string | undefined;

  do {
    const { issues, nextCursor } = await getTeamIssues(client, {
      teamId,
      cursor,
      filter,
    });
    for (const issue of issues) {
      yield issue;
    }
    cursor = nextCursor;
  } while (cursor);
}

export async function getIssue(
  client: LinearClient,
  issueId: string
): Promise<LinearIssue> {
  const data = await client.query<IssueResponse>(ISSUE_QUERY, { id: issueId });
  return LinearIssueSchema.parse(data.issue);
}

export async function getIssueComments(
  client: LinearClient,
  issueId: string,
  cursor?: string
): Promise<{ comments: LinearComment[]; nextCursor?: string }> {
  const data = await client.query<IssueCommentsResponse>(ISSUE_COMMENTS_QUERY, {
    issueId,
    first: 50,
    after: cursor,
  });

  const pageInfo = data.issue.comments.pageInfo;

  return {
    comments: data.issue.comments.nodes,
    nextCursor: pageInfo.hasNextPage
      ? (pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllIssueComments(
  client: LinearClient,
  issueId: string
): AsyncGenerator<LinearComment, void, undefined> {
  let cursor: string | undefined;

  do {
    const { comments, nextCursor } = await getIssueComments(
      client,
      issueId,
      cursor
    );
    for (const comment of comments) {
      yield comment;
    }
    cursor = nextCursor;
  } while (cursor);
}
