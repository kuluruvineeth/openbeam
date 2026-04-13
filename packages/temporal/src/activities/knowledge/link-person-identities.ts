import type { Database } from "@openbeam/db";

export interface LinkPersonIdentitiesDependencies {
  db: Database;
}

export interface LinkPersonIdentitiesInput {
  teamId: string;
}

export interface LinkPersonIdentitiesOutput {
  merged: number;
}

export function createLinkPersonIdentitiesActivity(
  deps: LinkPersonIdentitiesDependencies
) {
  return async function linkPersonIdentities(
    input: LinkPersonIdentitiesInput
  ): Promise<LinkPersonIdentitiesOutput> {
    let merged = 0;

    const persons = await deps.db.entity.findMany({
      where: { teamId: input.teamId, type: "PERSON" },
      select: {
        id: true,
        normalizedName: true,
        aliases: true,
        mentionCount: true,
      },
    });

    const aliasMap = new Map<string, Set<string>>();
    for (const person of persons) {
      const keys = [person.normalizedName, ...person.aliases];
      for (const key of keys) {
        const normalized = key.toLowerCase().trim();
        if (!normalized) {
          continue;
        }
        let group = aliasMap.get(normalized);
        if (!group) {
          group = new Set();
          aliasMap.set(normalized, group);
        }
        group.add(person.id);
      }
    }

    const processed = new Set<string>();

    for (const [, entityIds] of aliasMap) {
      if (entityIds.size < 2) {
        continue;
      }

      const unique = [...entityIds].filter((id) => !processed.has(id));
      if (unique.length < 2) {
        continue;
      }

      const entities = await deps.db.entity.findMany({
        where: { id: { in: unique } },
        orderBy: { mentionCount: "desc" },
        select: {
          id: true,
          normalizedName: true,
          aliases: true,
          mentionCount: true,
        },
      });

      if (entities.length < 2) {
        continue;
      }

      const primary = entities[0];
      if (!primary) {
        continue;
      }
      const secondaries = entities.slice(1);

      for (const secondary of secondaries) {
        const existing = await deps.db.entity.findFirst({
          where: {
            teamId: input.teamId,
            type: "PERSON",
            normalizedName: primary.normalizedName,
            id: { not: primary.id },
          },
          select: { id: true },
        });

        if (existing && existing.id !== secondary.id) {
          processed.add(secondary.id);
          continue;
        }

        const newAliases = new Set([
          ...primary.aliases,
          secondary.normalizedName,
          ...secondary.aliases,
        ]);
        newAliases.delete(primary.normalizedName);

        await deps.db.$transaction(async (tx) => {
          await tx.entity.update({
            where: { id: primary.id },
            data: { aliases: [...newAliases] },
          });

          await tx.entityMention.updateMany({
            where: { entityId: secondary.id },
            data: { entityId: primary.id },
          });

          await tx.entityRelation.deleteMany({
            where: {
              OR: [
                { fromEntityId: secondary.id, toEntityId: primary.id },
                { fromEntityId: primary.id, toEntityId: secondary.id },
              ],
            },
          });

          await tx.entityRelation.updateMany({
            where: { fromEntityId: secondary.id },
            data: { fromEntityId: primary.id },
          });
          await tx.entityRelation.updateMany({
            where: { toEntityId: secondary.id },
            data: { toEntityId: primary.id },
          });

          await tx.entity.delete({ where: { id: secondary.id } });
        });

        processed.add(secondary.id);
        merged += 1;
      }
    }

    return { merged };
  };
}
