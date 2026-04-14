import type { Database } from "@openbeam/db";
import { moveEntityIdentities } from "@openbeam/db";

export interface MergeResult {
  canonicalId: string;
  mergedId: string;
  mentionsMoved: number;
  relationsMoved: number;
  identitiesMoved: number;
}

export function mergeEntities(
  db: Database,
  primaryId: string,
  secondaryId: string
): Promise<MergeResult> {
  return db.$transaction(async (tx) => {
    const [primary, secondary] = await Promise.all([
      tx.entity.findUniqueOrThrow({ where: { id: primaryId } }),
      tx.entity.findUniqueOrThrow({ where: { id: secondaryId } }),
    ]);

    const newAliases = new Set([
      ...primary.aliases,
      secondary.normalizedName,
      ...secondary.aliases,
    ]);
    newAliases.delete(primary.normalizedName);

    await tx.entity.update({
      where: { id: primaryId },
      data: {
        aliases: [...newAliases],
        mentionCount: primary.mentionCount + secondary.mentionCount,
        documentCount: primary.documentCount + secondary.documentCount,
        expertiseScore: Math.max(
          primary.expertiseScore,
          secondary.expertiseScore
        ),
        description: primary.description ?? secondary.description,
        imageUrl: primary.imageUrl ?? secondary.imageUrl,
      },
    });

    const mentionsResult = await tx.entityMention.updateMany({
      where: { entityId: secondaryId },
      data: { entityId: primaryId },
    });

    await tx.entityRelation.deleteMany({
      where: {
        OR: [
          { fromEntityId: secondaryId, toEntityId: primaryId },
          { fromEntityId: primaryId, toEntityId: secondaryId },
        ],
      },
    });

    const outgoingMoved = await tx.entityRelation.updateMany({
      where: { fromEntityId: secondaryId },
      data: { fromEntityId: primaryId },
    });
    const incomingMoved = await tx.entityRelation.updateMany({
      where: { toEntityId: secondaryId },
      data: { toEntityId: primaryId },
    });

    const identitiesResult = await moveEntityIdentities(
      tx as unknown as Database,
      secondaryId,
      primaryId
    );

    await tx.entity.delete({ where: { id: secondaryId } });

    return {
      canonicalId: primaryId,
      mergedId: secondaryId,
      mentionsMoved: mentionsResult.count,
      relationsMoved: outgoingMoved.count + incomingMoved.count,
      identitiesMoved: identitiesResult.count,
    };
  });
}
