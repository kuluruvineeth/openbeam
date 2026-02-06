import type { Database } from "@openplane/db";
import {
  DetectPatternsInputSchema,
  type DetectPatternsOutput,
} from "@openplane/types/temporal/activities/knowledge";
import { Context } from "@temporalio/activity";

const MIN_CLUSTER_SIZE = 3;

export interface DetectPatternsDependencies {
  db: Database;
}

export function createDetectPatternsActivity(deps: DetectPatternsDependencies) {
  return async function detectPatterns(
    rawInput: unknown
  ): Promise<DetectPatternsOutput> {
    const input = DetectPatternsInputSchema.parse(rawInput);

    if (input.entityCount === 0) {
      return { patternsDetected: 0, clusters: 0, communities: 0 };
    }

    Context.current().heartbeat({ stage: "loading_entities" });

    const entities = await deps.db.entity.findMany({
      where: {
        teamId: input.teamId,
        expertiseScore: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        type: true,
        embedding: true,
      },
      orderBy: { expertiseScore: "desc" },
      take: 1000,
    });

    Context.current().heartbeat({ stage: "building_adjacency" });

    const relations = await deps.db.entityRelation.findMany({
      where: {
        fromEntity: { teamId: input.teamId },
        confidence: { gt: 0.3 },
      },
      select: {
        fromEntityId: true,
        toEntityId: true,
        relationType: true,
        weight: true,
      },
    });

    const adjacency = new Map<string, Set<string>>();
    for (const rel of relations) {
      if (!adjacency.has(rel.fromEntityId)) {
        adjacency.set(rel.fromEntityId, new Set());
      }
      if (!adjacency.has(rel.toEntityId)) {
        adjacency.set(rel.toEntityId, new Set());
      }
      adjacency.get(rel.fromEntityId)?.add(rel.toEntityId);
      adjacency.get(rel.toEntityId)?.add(rel.fromEntityId);
    }

    Context.current().heartbeat({ stage: "detecting_communities" });

    const visited = new Set<string>();
    const communities: string[][] = [];

    for (const entity of entities) {
      if (visited.has(entity.id)) {
        continue;
      }

      const community: string[] = [];
      const queue = [entity.id];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
          continue;
        }
        if (visited.has(current)) {
          continue;
        }
        visited.add(current);
        community.push(current);

        const neighbors = adjacency.get(current);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }
      }

      if (community.length >= MIN_CLUSTER_SIZE) {
        communities.push(community);
      }
    }

    Context.current().heartbeat({ stage: "persisting_clusters" });

    let clustersCreated = 0;

    for (const community of communities) {
      const communityEntities = entities.filter((e) =>
        community.includes(e.id)
      );
      if (communityEntities.length === 0) {
        continue;
      }

      const typeCounts = new Map<string, number>();
      for (const e of communityEntities) {
        typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
      }
      const dominantType =
        [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "MIXED";

      const topEntities = communityEntities.slice(0, 3).map((e) => e.name);
      const clusterName = `${dominantType}: ${topEntities.join(", ")}`;

      await deps.db.topicCluster.upsert({
        where: {
          teamId_name: {
            teamId: input.teamId,
            name: clusterName,
          },
        },
        create: {
          teamId: input.teamId,
          name: clusterName,
          description: `Cluster of ${community.length} related ${dominantType.toLowerCase()} entities`,
          documentCount: community.length,
        },
        update: {
          documentCount: community.length,
        },
      });

      clustersCreated += 1;

      Context.current().heartbeat({
        stage: "persisting_clusters",
        progress: clustersCreated,
        total: communities.length,
      });
    }

    return {
      patternsDetected: communities.length,
      clusters: clustersCreated,
      communities: communities.length,
    };
  };
}
