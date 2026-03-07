import db, {
  batchUpsertEntities,
  batchUpsertEntityRelations,
  type CreateEntityMentionInput,
  createManyEntityMentions,
  type EntityType,
  type EvidenceItem,
  type UpsertEntityInput,
  type UpsertEntityRelationInput,
} from "@openbeam/db";
import type {
  ExtractedEntity,
  SaveEntitiesInput,
  SaveEntitiesOutput,
} from "./types";

const LABEL_TO_TYPE: Record<string, EntityType> = {
  person: "PERSON",
  team: "TEAM",
  project: "PROJECT",
  topic: "TOPIC",
  technology: "TECHNOLOGY",
  location: "LOCATION",
  organization: "ORGANIZATION",
  channel: "CHANNEL",
  repository: "REPOSITORY",
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

interface PreparedEntity {
  text: string;
  label: string;
  score: number;
  source: string;
  entityType: EntityType;
  normalizedName: string;
}

function prepareEntityData(entities: ExtractedEntity[]): PreparedEntity[] {
  const result: PreparedEntity[] = [];

  for (const entity of entities) {
    const entityType = LABEL_TO_TYPE[entity.label.toLowerCase()];
    if (!entityType) {
      continue;
    }
    result.push({
      ...entity,
      entityType,
      normalizedName: normalizeName(entity.text),
    });
  }

  return result;
}

export async function saveEntities(
  input: SaveEntitiesInput
): Promise<SaveEntitiesOutput> {
  const { documentId, teamId, connectorType, author, entities } = input;

  const preparedEntities = prepareEntityData(entities);

  if (preparedEntities.length === 0) {
    return { entitiesCreated: 0, relationsCreated: 0 };
  }

  const entityInputs: UpsertEntityInput[] = preparedEntities.map((e) => ({
    teamId,
    type: e.entityType,
    name: e.text,
    normalizedName: e.normalizedName,
    externalSource: connectorType,
  }));

  const savedEntities = await batchUpsertEntities(db, entityInputs);

  const entityMap = new Map<string, string>();
  for (let i = 0; i < preparedEntities.length; i++) {
    const prepared = preparedEntities[i];
    const saved = savedEntities[i];
    if (prepared && saved) {
      entityMap.set(prepared.text, saved.id);
    }
  }

  const mentionInputs: CreateEntityMentionInput[] = [];
  for (const e of preparedEntities) {
    const entityId = entityMap.get(e.text);
    if (entityId) {
      mentionInputs.push({
        entityId,
        documentId,
        teamId,
        mentionText: e.text,
        confidence: e.score,
        source: e.source,
      });
    }
  }

  if (mentionInputs.length > 0) {
    await createManyEntityMentions(db, mentionInputs);
  }

  let relationsCreated = 0;

  if (author) {
    const authorNormalized = normalizeName(author);
    const authorEntities = await batchUpsertEntities(db, [
      {
        teamId,
        type: "PERSON",
        name: author,
        normalizedName: authorNormalized,
        externalSource: connectorType,
      },
    ]);

    const authorEntity = authorEntities[0];
    if (authorEntity) {
      const topicRelations: UpsertEntityRelationInput[] = [];
      const evidence: EvidenceItem = {
        docId: documentId,
        timestamp: new Date().toISOString(),
      };

      for (const e of preparedEntities) {
        if (e.entityType === "TOPIC" || e.entityType === "TECHNOLOGY") {
          const topicId = entityMap.get(e.text);
          if (topicId) {
            topicRelations.push({
              fromEntityId: authorEntity.id,
              toEntityId: topicId,
              relationType: "EXPERT_IN",
              weight: e.score,
              confidence: e.score,
              evidence: [evidence],
            });
          }
        }
      }

      if (topicRelations.length > 0) {
        await batchUpsertEntityRelations(db, topicRelations);
        relationsCreated = topicRelations.length;
      }
    }
  }

  return {
    entitiesCreated: preparedEntities.length,
    relationsCreated,
  };
}
