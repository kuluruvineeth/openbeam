import type { Database } from "@openbeam/db";
import { createEntityChange } from "@openbeam/db";
import type { InvalidateEdgesInput, InvalidateEdgesOutput } from "./types";

export interface InvalidateEdgesDependencies {
  db: Database;
}

export function createInvalidateEdgesActivity(
  deps: InvalidateEdgesDependencies
) {
  return async function invalidateEdges(
    input: InvalidateEdgesInput
  ): Promise<InvalidateEdgesOutput> {
    const mentions = await deps.db.entityMention.findMany({
      where: { documentId: input.documentId },
      select: { id: true, entityId: true },
    });

    if (mentions.length === 0) {
      return { edgesInvalidated: 0, mentionsRemoved: 0 };
    }

    const entityIds = [...new Set(mentions.map((m) => m.entityId))];

    let edgesInvalidated = 0;

    for (const entityId of entityIds) {
      const otherMentionCount = await deps.db.entityMention.count({
        where: {
          entityId,
          documentId: { not: input.documentId },
        },
      });

      if (otherMentionCount === 0) {
        const relations = await deps.db.entityRelation.findMany({
          where: {
            OR: [{ fromEntityId: entityId }, { toEntityId: entityId }],
            confidence: { gt: 0 },
          },
        });

        for (const relation of relations) {
          const oldConfidence = relation.confidence;
          await deps.db.entityRelation.update({
            where: { id: relation.id },
            data: { confidence: 0 },
          });

          await createEntityChange(deps.db, {
            teamId: input.teamId,
            entityId,
            field: "relation.confidence",
            oldValue: oldConfidence,
            newValue: 0,
            source: "INFERENCE_PIPELINE",
            triggeredBy: `document_deleted:${input.documentId}`,
          });

          edgesInvalidated += 1;
        }
      }
    }

    await deps.db.entityMention.deleteMany({
      where: { documentId: input.documentId },
    });

    return {
      edgesInvalidated,
      mentionsRemoved: mentions.length,
    };
  };
}
