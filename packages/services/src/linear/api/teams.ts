import {
  LinearConnectionSchema,
  type LinearTeam,
  LinearTeamSchema,
} from "@openplane/types/services/connectors/linear";
import type { LinearClient } from "../client";

const TEAMS_QUERY = `
  query Teams($first: Int!, $after: String) {
    teams(first: $first, after: $after) {
      nodes {
        id
        name
        key
        description
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

interface TeamsResponse {
  teams: {
    nodes: LinearTeam[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

export async function getTeams(
  client: LinearClient,
  cursor?: string
): Promise<{ teams: LinearTeam[]; nextCursor?: string }> {
  const data = await client.query<TeamsResponse>(TEAMS_QUERY, {
    first: 50,
    after: cursor,
  });

  const connection = LinearConnectionSchema(LinearTeamSchema).parse(data.teams);

  return {
    teams: connection.nodes,
    nextCursor: connection.pageInfo.hasNextPage
      ? (connection.pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllTeams(
  client: LinearClient
): AsyncGenerator<LinearTeam, void, undefined> {
  let cursor: string | undefined;

  do {
    const { teams, nextCursor } = await getTeams(client, cursor);
    for (const team of teams) {
      yield team;
    }
    cursor = nextCursor;
  } while (cursor);
}
