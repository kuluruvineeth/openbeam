import type { Database } from "@openbeam/db";
import {
  AggregateMentionsInputSchema,
  type AggregateMentionsOutput,
} from "@openbeam/types/temporal/activities/knowledge";
import { Context } from "@temporalio/activity";
import { ApplicationFailure } from "@temporalio/common";

const HEARTBEAT_INTERVAL = 500;

export interface AggregateMentionsDependencies {
  db: Database;
}

export function createAggregateMentionsActivity(
  deps: AggregateMentionsDependencies
) {
  return async function aggregateMentions(
    rawInput: unknown
  ): Promise<AggregateMentionsOutput> {
    const input = AggregateMentionsInputSchema.parse(rawInput);
    const totalEntities = await deps.db.entity.count({
      where: { teamId: input.teamId },
    });

    const entities = await deps.db.entity.findMany({
      where: { teamId: input.teamId },
      select: { id: true, name: true, type: true },
      skip: input.entityBatchOffset,
      take: input.batchSize,
      orderBy: { id: "asc" },
    });

    if (entities.length === 0) {
      return {
        entityCount: 0,
        hasMore: false,
        nextOffset: null,
        summary: {},
      };
    }

    const entityIds = entities.map((e) => e.id);
    const sinceFilter = input.sinceTimestamp
      ? new Date(input.sinceTimestamp)
      : undefined;

    const mentionWhere = {
      entityId: { in: entityIds },
      teamId: input.teamId,
      ...(sinceFilter ? { createdAt: { gte: sinceFilter } } : {}),
    };

    const mentions = await deps.db.entityMention.groupBy({
      by: ["entityId", "source"],
      where: mentionWhere,
      _count: { id: true },
      _max: { createdAt: true },
    });

    const summary: AggregateMentionsOutput["summary"] = {};

    const mentionsByEntityId = new Map<string, typeof mentions>();
    for (const mention of mentions) {
      const existing = mentionsByEntityId.get(mention.entityId);
      if (existing) {
        existing.push(mention);
      } else {
        mentionsByEntityId.set(mention.entityId, [mention]);
      }
    }

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity) {
        continue;
      }
      const entityMentions = mentionsByEntityId.get(entity.id) ?? [];

      if (entityMentions.length === 0) {
        continue;
      }

      const totalCount = entityMentions.reduce(
        (sum, m) => sum + m._count.id,
        0
      );
      const sources = [...new Set(entityMentions.map((m) => m.source))];
      const lastMentionedAt = Math.max(
        ...entityMentions
          .map((m) => m._max.createdAt?.getTime())
          .filter((t): t is number => t !== undefined)
      );

      summary[entity.id] = {
        entityId: entity.id,
        mentionCount: totalCount,
        sources,
        lastMentionedAt,
      };

      if ((i + 1) % HEARTBEAT_INTERVAL === 0) {
        Context.current().heartbeat({
          processed: i + 1,
          total: entities.length,
        });
      }
    }

    await deps.db.entity.updateMany({
      where: {
        id: { in: Object.keys(summary) },
        teamId: input.teamId,
      },
      data: { lastActiveAt: new Date() },
    });

    try {
      const entries = Object.entries(summary);
      if (entries.length > 0) {
        await deps.db.$transaction(
          entries.map(([entityId, data]) =>
            deps.db.entity.update({
              where: { id: entityId },
              data: { mentionCount: data.mentionCount },
            })
          )
        );
      }
    } catch (error) {
      throw ApplicationFailure.nonRetryable(
        `Failed to update mention counts: ${error instanceof Error ? error.message : String(error)}`,
        "InvalidInputError"
      );
    }

    const processedCount = input.entityBatchOffset + entities.length;
    const hasMore = processedCount < totalEntities;
    const nextOffset = hasMore ? processedCount : null;

    return {
      entityCount: entities.length,
      hasMore,
      nextOffset,
      summary,
    };
  };
}
