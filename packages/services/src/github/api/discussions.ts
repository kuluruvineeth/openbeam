import {
  type GitHubDiscussion,
  GitHubDiscussionSchema,
} from "@openbeam/types/services/connectors/github";
import type { GitHubClient } from "../client";

const DISCUSSIONS_QUERY = `
  query RepoDiscussions($owner: String!, $name: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      discussions(first: $first, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          number
          title
          body
          category {
            id
            name
            emoji
          }
          author {
            login
            avatarUrl
          }
          answer {
            body
            author {
              login
            }
          }
          url
          createdAt
          updatedAt
          comments {
            totalCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

interface DiscussionsResponse {
  repository: {
    discussions: {
      nodes: unknown[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
}

export async function getRepoDiscussions(
  client: GitHubClient,
  owner: string,
  repo: string,
  cursor?: string
): Promise<{ discussions: GitHubDiscussion[]; nextCursor?: string }> {
  const data = await client.graphql<DiscussionsResponse>(DISCUSSIONS_QUERY, {
    owner,
    name: repo,
    first: 50,
    after: cursor,
  });

  const connection = data.repository.discussions;
  const discussions = connection.nodes.map((n) =>
    GitHubDiscussionSchema.parse(n)
  );

  return {
    discussions,
    nextCursor: connection.pageInfo.hasNextPage
      ? (connection.pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllRepoDiscussions(
  client: GitHubClient,
  owner: string,
  repo: string
): AsyncGenerator<GitHubDiscussion, void, undefined> {
  let cursor: string | undefined;

  do {
    const { discussions, nextCursor } = await getRepoDiscussions(
      client,
      owner,
      repo,
      cursor
    );
    for (const discussion of discussions) {
      yield discussion;
    }
    cursor = nextCursor;
  } while (cursor);
}
