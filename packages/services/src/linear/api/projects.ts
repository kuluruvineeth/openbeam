import {
  LinearConnectionSchema,
  type LinearPageInfo,
  type LinearProject,
  LinearProjectSchema,
} from "@openplane/types/services/connectors/linear";
import type { LinearClient } from "../client";

const PROJECT_FRAGMENT = `
  fragment ProjectFields on Project {
    id
    name
    description
    icon
    color
    state
    progress
    targetDate
    startedAt
    completedAt
    canceledAt
    createdAt
    updatedAt
    archivedAt
    url
    lead {
      id
      name
      email
      avatarUrl
      displayName
      active
    }
    teams {
      nodes {
        id
        name
        key
        description
      }
    }
  }
`;

const PROJECTS_QUERY = `
  ${PROJECT_FRAGMENT}
  query Projects($first: Int!, $after: String, $filter: ProjectFilter) {
    projects(first: $first, after: $after, filter: $filter, orderBy: updatedAt) {
      nodes {
        ...ProjectFields
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

const PROJECT_QUERY = `
  ${PROJECT_FRAGMENT}
  query Project($id: String!) {
    project(id: $id) {
      ...ProjectFields
    }
  }
`;

interface ProjectsResponse {
  projects: {
    nodes: LinearProject[];
    pageInfo: LinearPageInfo;
  };
}

interface ProjectResponse {
  project: LinearProject;
}

export interface GetProjectsOptions {
  cursor?: string;
  filter?: {
    updatedAt?: { gte: string };
  };
}

export async function getProjects(
  client: LinearClient,
  options: GetProjectsOptions = {}
): Promise<{ projects: LinearProject[]; nextCursor?: string }> {
  const { cursor, filter } = options;

  const data = await client.query<ProjectsResponse>(PROJECTS_QUERY, {
    first: 50,
    after: cursor,
    filter,
  });

  const connection = LinearConnectionSchema(LinearProjectSchema).parse(
    data.projects
  );

  return {
    projects: connection.nodes,
    nextCursor: connection.pageInfo.hasNextPage
      ? (connection.pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllProjects(
  client: LinearClient,
  filter?: { updatedAt?: { gte: string } }
): AsyncGenerator<LinearProject, void, undefined> {
  let cursor: string | undefined;

  do {
    const { projects, nextCursor } = await getProjects(client, {
      cursor,
      filter,
    });
    for (const project of projects) {
      yield project;
    }
    cursor = nextCursor;
  } while (cursor);
}

export async function getProject(
  client: LinearClient,
  projectId: string
): Promise<LinearProject> {
  const data = await client.query<ProjectResponse>(PROJECT_QUERY, {
    id: projectId,
  });
  return LinearProjectSchema.parse(data.project);
}
