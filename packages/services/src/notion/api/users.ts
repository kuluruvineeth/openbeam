import type {
  NotionUser,
  NotionUserLookup,
} from "@openbeam/types/services/connectors/notion";
import type { NotionClient } from "../client";

interface UsersListResponse {
  object: "list";
  results: NotionUser[];
  next_cursor: string | null;
  has_more: boolean;
  type: "user";
}

export async function getUser(
  client: NotionClient,
  userId: string
): Promise<NotionUser> {
  return await client.get<NotionUser>(`/users/${userId}`);
}

export async function getMe(client: NotionClient): Promise<NotionUser> {
  return await client.get<NotionUser>("/users/me");
}

export interface ListUsersOptions {
  startCursor?: string;
  pageSize?: number;
}

export async function listUsers(
  client: NotionClient,
  options: ListUsersOptions = {}
): Promise<UsersListResponse> {
  const params: Record<string, string | number> = {};

  if (options.startCursor) {
    params.start_cursor = options.startCursor;
  }
  if (options.pageSize) {
    params.page_size = Math.min(options.pageSize, 100);
  }

  return await client.get<UsersListResponse>("/users", params);
}

export async function* fetchAllUsers(
  client: NotionClient,
  options: Omit<ListUsersOptions, "startCursor"> = {}
): AsyncGenerator<NotionUser> {
  let cursor: string | undefined;

  do {
    const response = await listUsers(client, {
      ...options,
      startCursor: cursor,
    });

    for (const user of response.results) {
      yield user;
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
}

export async function getAllUsers(
  client: NotionClient,
  options: Omit<ListUsersOptions, "startCursor"> = {}
): Promise<NotionUser[]> {
  const users: NotionUser[] = [];

  for await (const user of fetchAllUsers(client, options)) {
    users.push(user);
  }

  return users;
}

export async function createUserLookup(
  client: NotionClient
): Promise<NotionUserLookup> {
  const users = await getAllUsers(client);
  const userMap = new Map<string, NotionUser>();

  for (const user of users) {
    userMap.set(user.id, user);
  }

  return {
    get: (userId) => userMap.get(userId),
    getName: (userId) => userMap.get(userId)?.name,
    getEmail: (userId) => userMap.get(userId)?.person?.email,
    getAvatar: (userId) => userMap.get(userId)?.avatar_url ?? undefined,
    has: (userId) => userMap.has(userId),
    get size() {
      return userMap.size;
    },
  };
}
