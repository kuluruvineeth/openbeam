import { z } from "zod";
import type { UserSearchProfile } from "../../prisma/generated/client";
import type { Database } from "../index";

export const RecentQuerySchema = z.object({
  query: z.string(),
  queryHash: z.string(),
  timestamp: z.number(),
  resultCount: z.number(),
});

export const RecentClickSchema = z.object({
  docId: z.string(),
  connectorType: z.string(),
  authorId: z.string().nullable(),
  topicIds: z.array(z.string()),
  timestamp: z.number(),
  dwellMs: z.number(),
});

const WeightMapSchema = z.record(z.string(), z.number());

export type RecentQuery = z.infer<typeof RecentQuerySchema>;
export type RecentClick = z.infer<typeof RecentClickSchema>;

export interface ParsedUserSearchProfile {
  id: string;
  userId: string;
  teamId: string;
  department: string | null;
  searchCount: number;
  clickCount: number;
  avgDwellMs: number | null;
  connectorWeights: Record<string, number>;
  authorInteractions: Record<string, number>;
  topicWeights: Record<string, number>;
  queryEmbedding: Uint8Array<ArrayBuffer> | null;
  docEmbedding: Uint8Array<ArrayBuffer> | null;
  recentQueries: RecentQuery[];
  recentClicks: RecentClick[];
  embeddingVersion: number;
  lastEmbeddingAt: Date | null;
  lastActiveAt: Date | null;
  personalizationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function parseWeightMap(data: unknown): Record<string, number> {
  const result = WeightMapSchema.safeParse(data ?? {});
  return result.success ? result.data : {};
}

function parseRecentQueries(data: unknown): RecentQuery[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => RecentQuerySchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data as RecentQuery);
}

function parseRecentClicks(data: unknown): RecentClick[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => RecentClickSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data as RecentClick);
}

function parseProfile(profile: UserSearchProfile): ParsedUserSearchProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    teamId: profile.teamId,
    department: profile.department,
    searchCount: profile.searchCount,
    clickCount: profile.clickCount,
    avgDwellMs: profile.avgDwellMs,
    connectorWeights: parseWeightMap(profile.connectorWeights),
    authorInteractions: parseWeightMap(profile.authorInteractions),
    topicWeights: parseWeightMap(profile.topicWeights),
    queryEmbedding: profile.queryEmbedding,
    docEmbedding: profile.docEmbedding,
    recentQueries: parseRecentQueries(profile.recentQueries),
    recentClicks: parseRecentClicks(profile.recentClicks),
    embeddingVersion: profile.embeddingVersion,
    lastEmbeddingAt: profile.lastEmbeddingAt,
    lastActiveAt: profile.lastActiveAt,
    personalizationEnabled: profile.personalizationEnabled,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function findUserSearchProfile(
  db: Database,
  userId: string,
  teamId: string
): Promise<ParsedUserSearchProfile | null> {
  const profile = await db.userSearchProfile.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
  });

  return profile ? parseProfile(profile) : null;
}

export async function findUserSearchProfilesByTeam(
  db: Database,
  teamId: string,
  options?: {
    minSearchCount?: number;
    department?: string;
    limit?: number;
  }
): Promise<ParsedUserSearchProfile[]> {
  const profiles = await db.userSearchProfile.findMany({
    where: {
      teamId,
      department: options?.department,
      searchCount: options?.minSearchCount
        ? { gte: options.minSearchCount }
        : undefined,
    },
    take: options?.limit,
  });

  return profiles.map(parseProfile);
}

export interface TeamProfileStats {
  avgSearchCount: number;
  avgClickCount: number;
  connectorWeights: Record<string, number>;
}

export async function getTeamProfileStats(
  db: Database,
  teamId: string,
  limit = 100
): Promise<TeamProfileStats | null> {
  const profiles = await db.userSearchProfile.findMany({
    where: { teamId },
    select: {
      searchCount: true,
      clickCount: true,
      connectorWeights: true,
    },
    take: limit,
  });

  if (profiles.length === 0) {
    return null;
  }

  const avgSearchCount = Math.round(
    profiles.reduce((sum, p) => sum + p.searchCount, 0) / profiles.length
  );
  const avgClickCount = Math.round(
    profiles.reduce((sum, p) => sum + p.clickCount, 0) / profiles.length
  );

  const aggregatedWeights = new Map<string, number[]>();

  for (const profile of profiles) {
    const weights = parseWeightMap(profile.connectorWeights);
    for (const [connector, weight] of Object.entries(weights)) {
      const existing = aggregatedWeights.get(connector);
      if (existing) {
        existing.push(weight);
      } else {
        aggregatedWeights.set(connector, [weight]);
      }
    }
  }

  const connectorWeights: Record<string, number> = {};
  for (const [connector, weights] of aggregatedWeights) {
    connectorWeights[connector] =
      weights.reduce((a, b) => a + b, 0) / weights.length;
  }

  return { avgSearchCount, avgClickCount, connectorWeights };
}
