import type { SlackClient } from "../client";
import {
  type SlackTeam,
  SlackTeamSchema,
  type SlackUser,
  SlackUserSchema,
} from "../types";

export interface ListUsersOptions {
  limit?: number;
  includeLocale?: boolean;
}

interface UsersListResponse {
  ok: boolean;
  members?: unknown[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface UsersInfoResponse {
  ok: boolean;
  user?: unknown;
  error?: string;
}

interface TeamInfoResponse {
  ok: boolean;
  team?: unknown;
  error?: string;
}

export interface UserLookup {
  get(userId: string): SlackUser | undefined;
  getName(userId: string): string | undefined;
  getEmail(userId: string): string | undefined;
  has(userId: string): boolean;
  all(): SlackUser[];
  size: number;
}

export async function* listUsers(
  client: SlackClient,
  options: ListUsersOptions = {}
): AsyncGenerator<SlackUser, void, undefined> {
  const { limit = 200, includeLocale = false } = options;

  let cursor: string | undefined;

  do {
    const response = await client.call<UsersListResponse>("users.list", {
      limit: Math.min(limit, 1000),
      cursor,
      include_locale: includeLocale,
    });

    const members = response.members ?? [];

    for (const rawUser of members) {
      const parsed = SlackUserSchema.safeParse(rawUser);

      if (!parsed.success) {
        continue;
      }

      yield parsed.data;
    }

    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);
}

export async function getAllUsers(
  client: SlackClient,
  options: ListUsersOptions = {}
): Promise<SlackUser[]> {
  const users: SlackUser[] = [];

  for await (const user of listUsers(client, options)) {
    users.push(user);
  }

  return users;
}

export async function getActiveUsers(
  client: SlackClient,
  options: ListUsersOptions = {}
): Promise<SlackUser[]> {
  const users: SlackUser[] = [];

  for await (const user of listUsers(client, options)) {
    if (!user.deleted) {
      users.push(user);
    }
  }

  return users;
}

export async function getUserInfo(
  client: SlackClient,
  userId: string
): Promise<SlackUser | null> {
  const response = await client.call<UsersInfoResponse>("users.info", {
    user: userId,
  });

  if (!response.user) {
    return null;
  }

  const parsed = SlackUserSchema.safeParse(response.user);
  return parsed.success ? parsed.data : null;
}

export async function getUsersInfo(
  client: SlackClient,
  userIds: string[]
): Promise<Map<string, SlackUser>> {
  const users = new Map<string, SlackUser>();

  // Fetch users in parallel batches of 50
  const batchSize = 50;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((id) => getUserInfo(client, id))
    );

    for (let j = 0; j < batch.length; j++) {
      const user = results[j];
      const userId = batch[j];
      if (user && userId) {
        users.set(userId, user);
      }
    }
  }

  return users;
}

export async function getTeamInfo(
  client: SlackClient
): Promise<SlackTeam | null> {
  const response = await client.call<TeamInfoResponse>("team.info", {});

  if (!response.team) {
    return null;
  }

  const parsed = SlackTeamSchema.safeParse(response.team);
  return parsed.success ? parsed.data : null;
}

export async function createUserLookup(
  client: SlackClient,
  options: ListUsersOptions = {}
): Promise<UserLookup> {
  const users = await getAllUsers(client, options);
  const userMap = new Map<string, SlackUser>();

  for (const user of users) {
    userMap.set(user.id, user);
  }

  return {
    get: (userId: string) => userMap.get(userId),

    getName: (userId: string) => {
      const user = userMap.get(userId);
      if (!user) {
        return;
      }

      // Prefer display name, then real name, then username
      return (
        user.profile?.display_name ||
        user.profile?.real_name ||
        user.real_name ||
        user.name
      );
    },

    getEmail: (userId: string) => {
      const user = userMap.get(userId);
      return user?.profile?.email;
    },

    has: (userId: string) => userMap.has(userId),

    all: () => users,

    get size() {
      return userMap.size;
    },
  };
}

export function filterOutBots(users: SlackUser[]): SlackUser[] {
  return users.filter((user) => !(user.is_bot || user.is_app_user));
}

export function filterOutDeleted(users: SlackUser[]): SlackUser[] {
  return users.filter((user) => !user.deleted);
}

export function filterAdmins(users: SlackUser[]): SlackUser[] {
  return users.filter((user) => user.is_admin || user.is_owner);
}

export function getUserDisplayName(user: SlackUser): string {
  return (
    user.profile?.display_name ||
    user.profile?.real_name ||
    user.real_name ||
    user.name
  );
}

export function getUserAvatarUrl(user: SlackUser): string | undefined {
  const profile = user.profile;
  if (!profile) {
    return;
  }

  return (
    profile.image_512 ||
    profile.image_192 ||
    profile.image_72 ||
    profile.image_48 ||
    profile.image_32 ||
    profile.image_24
  );
}
