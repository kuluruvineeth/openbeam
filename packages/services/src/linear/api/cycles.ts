import {
  LinearConnectionSchema,
  type LinearCycle,
  LinearCycleSchema,
  type LinearPageInfo,
} from "@openplane/types/services/connectors/linear";
import type { LinearClient } from "../client";

const CYCLE_FRAGMENT = `
  fragment CycleFields on Cycle {
    id
    name
    number
    startsAt
    endsAt
    completedAt
    progress
    createdAt
    updatedAt
    archivedAt
    team {
      id
      name
      key
      description
    }
  }
`;

const TEAM_CYCLES_QUERY = `
  ${CYCLE_FRAGMENT}
  query TeamCycles($teamId: String!, $first: Int!, $after: String, $filter: CycleFilter) {
    team(id: $teamId) {
      cycles(first: $first, after: $after, filter: $filter, orderBy: updatedAt) {
        nodes {
          ...CycleFields
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

const CYCLE_QUERY = `
  ${CYCLE_FRAGMENT}
  query Cycle($id: String!) {
    cycle(id: $id) {
      ...CycleFields
    }
  }
`;

interface TeamCyclesResponse {
  team: {
    cycles: {
      nodes: LinearCycle[];
      pageInfo: LinearPageInfo;
    };
  };
}

interface CycleResponse {
  cycle: LinearCycle;
}

export interface GetTeamCyclesOptions {
  teamId: string;
  cursor?: string;
  filter?: {
    updatedAt?: { gte: string };
  };
}

export async function getTeamCycles(
  client: LinearClient,
  options: GetTeamCyclesOptions
): Promise<{ cycles: LinearCycle[]; nextCursor?: string }> {
  const { teamId, cursor, filter } = options;

  const data = await client.query<TeamCyclesResponse>(TEAM_CYCLES_QUERY, {
    teamId,
    first: 50,
    after: cursor,
    filter,
  });

  const connection = LinearConnectionSchema(LinearCycleSchema).parse(
    data.team.cycles
  );

  return {
    cycles: connection.nodes,
    nextCursor: connection.pageInfo.hasNextPage
      ? (connection.pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllTeamCycles(
  client: LinearClient,
  teamId: string,
  filter?: { updatedAt?: { gte: string } }
): AsyncGenerator<LinearCycle, void, undefined> {
  let cursor: string | undefined;

  do {
    const { cycles, nextCursor } = await getTeamCycles(client, {
      teamId,
      cursor,
      filter,
    });
    for (const cycle of cycles) {
      yield cycle;
    }
    cursor = nextCursor;
  } while (cursor);
}

export async function getCycle(
  client: LinearClient,
  cycleId: string
): Promise<LinearCycle> {
  const data = await client.query<CycleResponse>(CYCLE_QUERY, { id: cycleId });
  return LinearCycleSchema.parse(data.cycle);
}
