import type { UserSearchProfile } from "../../prisma/generated/client";
import type { Database } from "../index";
import type { RecentClick, RecentQuery } from "../queries/user-search-profile";

export interface CreateUserSearchProfileInput {
  userId: string;
  teamId: string;
  department?: string | null;
  queryEmbedding?: Uint8Array<ArrayBuffer>;
  docEmbedding?: Uint8Array<ArrayBuffer>;
  recentQueries?: RecentQuery[];
  recentClicks?: RecentClick[];
  connectorWeights?: Record<string, number>;
  topicWeights?: Record<string, number>;
}

export async function createUserSearchProfile(
  db: Database,
  data: CreateUserSearchProfileInput
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      department: data.department,
      queryEmbedding: data.queryEmbedding,
      docEmbedding: data.docEmbedding,
      recentQueries: data.recentQueries as object[] | undefined,
      recentClicks: data.recentClicks as object[] | undefined,
      connectorWeights: data.connectorWeights as object | undefined,
      topicWeights: data.topicWeights as object | undefined,
      embeddingVersion: 1,
      lastEmbeddingAt:
        data.queryEmbedding || data.docEmbedding ? new Date() : undefined,
      lastActiveAt: new Date(),
    },
  });
}

export interface UpdateQueryEmbeddingInput {
  queryEmbedding: Uint8Array<ArrayBuffer>;
  recentQueries: RecentQuery[];
}

export async function updateQueryEmbedding(
  db: Database,
  userId: string,
  teamId: string,
  data: UpdateQueryEmbeddingInput
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.update({
    where: {
      userId_teamId: { userId, teamId },
    },
    data: {
      queryEmbedding: data.queryEmbedding,
      recentQueries: data.recentQueries as object[],
      embeddingVersion: { increment: 1 },
      lastEmbeddingAt: new Date(),
      lastActiveAt: new Date(),
      searchCount: { increment: 1 },
    },
  });
}

export interface UpdateDocEmbeddingInput {
  docEmbedding: Uint8Array<ArrayBuffer>;
  recentClicks: RecentClick[];
  connectorWeights: Record<string, number>;
  authorInteractions: Record<string, number>;
  topicWeights: Record<string, number>;
  avgDwellMs: number;
}

export async function updateDocEmbedding(
  db: Database,
  userId: string,
  teamId: string,
  data: UpdateDocEmbeddingInput
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.update({
    where: {
      userId_teamId: { userId, teamId },
    },
    data: {
      docEmbedding: data.docEmbedding,
      recentClicks: data.recentClicks as object[],
      connectorWeights: data.connectorWeights as object,
      authorInteractions: data.authorInteractions as object,
      topicWeights: data.topicWeights as object,
      avgDwellMs: data.avgDwellMs,
      embeddingVersion: { increment: 1 },
      lastEmbeddingAt: new Date(),
      lastActiveAt: new Date(),
      clickCount: { increment: 1 },
    },
  });
}

export async function updateTopicWeights(
  db: Database,
  userId: string,
  teamId: string,
  topicWeights: Record<string, number>
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.upsert({
    where: {
      userId_teamId: { userId, teamId },
    },
    update: {
      topicWeights: topicWeights as object,
    },
    create: {
      userId,
      teamId,
      topicWeights: topicWeights as object,
    },
  });
}

export async function updatePersonalizationEnabled(
  db: Database,
  userId: string,
  teamId: string,
  enabled: boolean
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.update({
    where: {
      userId_teamId: { userId, teamId },
    },
    data: {
      personalizationEnabled: enabled,
    },
  });
}

export async function deleteUserSearchProfile(
  db: Database,
  userId: string,
  teamId: string
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.delete({
    where: {
      userId_teamId: { userId, teamId },
    },
  });
}

export async function updateConnectorWeights(
  db: Database,
  userId: string,
  teamId: string,
  connectorWeights: Record<string, number>
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.update({
    where: {
      userId_teamId: { userId, teamId },
    },
    data: {
      connectorWeights: connectorWeights as object,
    },
  });
}

export interface UpsertUserProfilePreferencesInput {
  personalizationEnabled?: boolean;
  department?: string | null;
}

export async function upsertUserProfilePreferences(
  db: Database,
  userId: string,
  teamId: string,
  preferences: UpsertUserProfilePreferencesInput
): Promise<UserSearchProfile> {
  return await db.userSearchProfile.upsert({
    where: {
      userId_teamId: { userId, teamId },
    },
    update: preferences,
    create: {
      userId,
      teamId,
      ...preferences,
    },
  });
}

export async function deleteAllUserProfilesForTeam(
  db: Database,
  teamId: string
): Promise<{ count: number }> {
  return await db.userSearchProfile.deleteMany({
    where: { teamId },
  });
}
