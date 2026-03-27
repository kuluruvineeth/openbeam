import type { Database } from "@openbeam/db";
import type { ContextAnalytics } from "@openbeam/types/context";

export async function getContextAnalytics(
  db: Database,
  teamId: string
): Promise<ContextAnalytics> {
  const [
    totalEntries,
    totalSessions,
    totalMemories,
    topAccessed,
    recentlyCreated,
    entriesByType,
  ] = await Promise.all([
    db.contextEntry.count({ where: { teamId } }),
    db.contextSession.count({ where: { teamId } }),
    db.contextEntry.count({ where: { teamId, contextType: "memory" } }),
    db.contextEntry.findMany({
      where: { teamId },
      orderBy: { activeCount: "desc" },
      take: 10,
      select: { uri: true, abstractText: true, activeCount: true },
    }),
    db.contextEntry.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { uri: true, abstractText: true, createdAt: true },
    }),
    db.contextEntry.groupBy({
      by: ["contextType"],
      where: { teamId },
      _count: { id: true },
    }),
  ]);

  const typeMap: Record<string, number> = {};
  for (const entry of entriesByType) {
    typeMap[entry.contextType] = entry._count.id;
  }

  return {
    totalEntries,
    entriesByType: typeMap as Record<string, number>,
    entriesByCategory: {},
    totalSessions,
    totalMemories,
    averageHotnessScore: 0,
    topAccessed,
    recentlyCreated: recentlyCreated.map((e) => ({
      uri: e.uri,
      abstractText: e.abstractText,
      createdAt: e.createdAt,
    })),
    memoryGrowthRate: 0,
    retrievalStats: {
      totalSearches: 0,
      averageResultCount: 0,
      averageLatencyMs: 0,
      zeroResultRate: 0,
    },
  };
}
