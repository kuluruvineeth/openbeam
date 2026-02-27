import { getRedisClient } from "@openplane/redis";
import {
  type GitHubUser,
  type GitHubUserLookup,
  GitHubUserSchema,
} from "@openplane/types/services/connectors/github";
import type { GitHubClient } from "../client";

const USER_CACHE_PREFIX = "github:users:";
const USER_CACHE_TTL = 3600;

export async function getOrgMembers(
  client: GitHubClient,
  org: string,
  page = 1,
  perPage = 100
): Promise<{ users: GitHubUser[]; nextPage?: number }> {
  const raw = await client.get<unknown[]>(`/orgs/${org}/members`, {
    per_page: String(perPage),
    page: String(page),
  });

  const users = raw.map((u) => GitHubUserSchema.parse(u));
  const hasMore = users.length === perPage;

  return {
    users,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* getAllOrgMembers(
  client: GitHubClient,
  org: string
): AsyncGenerator<GitHubUser, void, undefined> {
  let page: number | undefined = 1;

  do {
    const { users, nextPage } = await getOrgMembers(client, org, page);
    for (const user of users) {
      yield user;
    }
    page = nextPage;
  } while (page);
}

async function getCachedUsers(
  connectorId: string
): Promise<GitHubUser[] | null> {
  const redis = await getRedisClient();
  const cached = await redis.get(`${USER_CACHE_PREFIX}${connectorId}`);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached) as GitHubUser[];
}

async function setCachedUsers(
  connectorId: string,
  users: GitHubUser[]
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(`${USER_CACHE_PREFIX}${connectorId}`, JSON.stringify(users), {
    EX: USER_CACHE_TTL,
  });
}

export async function createUserLookup(
  client: GitHubClient,
  org?: string,
  options?: { skipCache?: boolean }
): Promise<GitHubUserLookup> {
  const userMap = new Map<string, GitHubUser>();

  if (!options?.skipCache) {
    const cached = await getCachedUsers(client.connectorId);
    if (cached) {
      for (const user of cached) {
        userMap.set(user.login, user);
      }
      return buildUserLookup(userMap);
    }
  }

  const users: GitHubUser[] = [];

  if (org) {
    try {
      for await (const user of getAllOrgMembers(client, org)) {
        userMap.set(user.login, user);
        users.push(user);
      }
    } catch {
      /* org member listing may fail for non-org repos */
    }
  }

  if (users.length > 0) {
    await setCachedUsers(client.connectorId, users);
  }

  return buildUserLookup(userMap);
}

function buildUserLookup(userMap: Map<string, GitHubUser>): GitHubUserLookup {
  return {
    get(login: string): GitHubUser | undefined {
      return userMap.get(login);
    },
    getName(login: string): string | undefined {
      const user = userMap.get(login);
      return user?.name ?? user?.login;
    },
    getAvatar(login: string): string | undefined {
      return userMap.get(login)?.avatar_url;
    },
    has(login: string): boolean {
      return userMap.has(login);
    },
    get size(): number {
      return userMap.size;
    },
  };
}
