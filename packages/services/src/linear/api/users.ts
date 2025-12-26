import { getRedisClient } from "@openplane/redis";
import type { LinearClient } from "../client";
import {
  LinearConnectionSchema,
  type LinearUser,
  type LinearUserLookup,
  LinearUserSchema,
} from "../types";

const USER_CACHE_PREFIX = "linear:users:";
const USER_CACHE_TTL = 3600; // 1 hour

const USERS_QUERY = `
  query Users($first: Int!, $after: String) {
    users(first: $first, after: $after) {
      nodes {
        id
        name
        email
        avatarUrl
        displayName
        active
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

interface UsersResponse {
  users: {
    nodes: LinearUser[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

export async function getUsers(
  client: LinearClient,
  cursor?: string
): Promise<{ users: LinearUser[]; nextCursor?: string }> {
  const data = await client.query<UsersResponse>(USERS_QUERY, {
    first: 50,
    after: cursor,
  });

  const connection = LinearConnectionSchema(LinearUserSchema).parse(data.users);

  return {
    users: connection.nodes,
    nextCursor: connection.pageInfo.hasNextPage
      ? (connection.pageInfo.endCursor ?? undefined)
      : undefined,
  };
}

export async function* getAllUsers(
  client: LinearClient
): AsyncGenerator<LinearUser, void, undefined> {
  let cursor: string | undefined;

  do {
    const { users, nextCursor } = await getUsers(client, cursor);
    for (const user of users) {
      yield user;
    }
    cursor = nextCursor;
  } while (cursor);
}

async function getCachedUsers(
  connectorId: string
): Promise<LinearUser[] | null> {
  const redis = await getRedisClient();
  const cached = await redis.get(`${USER_CACHE_PREFIX}${connectorId}`);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached) as LinearUser[];
}

async function setCachedUsers(
  connectorId: string,
  users: LinearUser[]
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(`${USER_CACHE_PREFIX}${connectorId}`, JSON.stringify(users), {
    EX: USER_CACHE_TTL,
  });
}

export async function createUserLookup(
  client: LinearClient,
  options?: { skipCache?: boolean }
): Promise<LinearUserLookup> {
  const userMap = new Map<string, LinearUser>();

  // Try to load from cache first
  if (!options?.skipCache) {
    const cached = await getCachedUsers(client.connectorId);
    if (cached) {
      for (const user of cached) {
        userMap.set(user.id, user);
      }
      return buildUserLookup(userMap);
    }
  }

  // Fetch from API and cache
  const users: LinearUser[] = [];
  for await (const user of getAllUsers(client)) {
    userMap.set(user.id, user);
    users.push(user);
  }

  // Cache for future syncs
  await setCachedUsers(client.connectorId, users);

  return buildUserLookup(userMap);
}

function buildUserLookup(userMap: Map<string, LinearUser>): LinearUserLookup {
  return {
    get(userId: string): LinearUser | undefined {
      return userMap.get(userId);
    },
    getName(userId: string): string | undefined {
      return userMap.get(userId)?.displayName;
    },
    getAvatar(userId: string): string | undefined {
      return userMap.get(userId)?.avatarUrl ?? undefined;
    },
    has(userId: string): boolean {
      return userMap.has(userId);
    },
    get size(): number {
      return userMap.size;
    },
  };
}
