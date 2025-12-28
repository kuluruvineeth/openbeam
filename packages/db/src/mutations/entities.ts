import type {
  EntityType,
  Prisma,
  RelationType,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface EvidenceItem {
  docId: string;
  action?: string;
  weight?: number;
  timestamp: string;
}

export interface CreateEntityInput {
  teamId: string;
  type: EntityType;
  name: string;
  normalizedName: string;
  aliases?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  embedding?: Uint8Array;
  imageUrl?: string;
  externalId?: string;
  externalSource?: string;
}

export function createEntity(db: Database, data: CreateEntityInput) {
  return db.entity.create({
    data: {
      teamId: data.teamId,
      type: data.type,
      name: data.name,
      normalizedName: data.normalizedName,
      aliases: data.aliases ?? [],
      description: data.description,
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      embedding: data.embedding as Prisma.EntityCreateInput["embedding"],
      imageUrl: data.imageUrl,
      externalId: data.externalId,
      externalSource: data.externalSource,
    },
  });
}

export interface UpsertEntityInput {
  teamId: string;
  type: EntityType;
  name: string;
  normalizedName: string;
  aliases?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  externalId?: string;
  externalSource?: string;
}

export function upsertEntity(db: Database, data: UpsertEntityInput) {
  return db.entity.upsert({
    where: {
      teamId_type_normalizedName: {
        teamId: data.teamId,
        type: data.type,
        normalizedName: data.normalizedName,
      },
    },
    update: {
      aliases: data.aliases,
      description: data.description,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
      externalId: data.externalId,
      externalSource: data.externalSource,
    },
    create: {
      teamId: data.teamId,
      type: data.type,
      name: data.name,
      normalizedName: data.normalizedName,
      aliases: data.aliases ?? [],
      description: data.description,
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      externalId: data.externalId,
      externalSource: data.externalSource,
    },
  });
}

export interface UpdateEntityInput {
  aliases?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  embedding?: Uint8Array;
  imageUrl?: string;
  expertiseScore?: number;
  documentCount?: number;
  mentionCount?: number;
  lastActiveAt?: Date;
}

export function updateEntity(
  db: Database,
  id: string,
  data: UpdateEntityInput
) {
  return db.entity.update({
    where: { id },
    data: {
      aliases: data.aliases,
      description: data.description,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
      embedding: data.embedding as Prisma.EntityUpdateInput["embedding"],
      imageUrl: data.imageUrl,
      expertiseScore: data.expertiseScore,
      documentCount: data.documentCount,
      mentionCount: data.mentionCount,
      lastActiveAt: data.lastActiveAt,
    },
  });
}

export function incrementEntityMentionCount(db: Database, id: string) {
  return db.entity.update({
    where: { id },
    data: {
      mentionCount: { increment: 1 },
      lastActiveAt: new Date(),
    },
  });
}

export function incrementEntityDocumentCount(db: Database, id: string) {
  return db.entity.update({
    where: { id },
    data: {
      documentCount: { increment: 1 },
      lastActiveAt: new Date(),
    },
  });
}

export function deleteEntity(db: Database, id: string) {
  return db.entity.delete({ where: { id } });
}

export interface CreateEntityRelationInput {
  fromEntityId: string;
  toEntityId: string;
  relationType: RelationType;
  weight?: number;
  confidence?: number;
  evidence?: EvidenceItem[];
}

export function createEntityRelation(
  db: Database,
  data: CreateEntityRelationInput
) {
  return db.entityRelation.create({
    data: {
      fromEntityId: data.fromEntityId,
      toEntityId: data.toEntityId,
      relationType: data.relationType,
      weight: data.weight ?? 1.0,
      confidence: data.confidence ?? 1.0,
      evidence: (data.evidence ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
}

export interface UpsertEntityRelationInput {
  fromEntityId: string;
  toEntityId: string;
  relationType: RelationType;
  weight?: number;
  confidence?: number;
  evidence?: EvidenceItem[];
}

export function upsertEntityRelation(
  db: Database,
  data: UpsertEntityRelationInput
) {
  return db.entityRelation.upsert({
    where: {
      fromEntityId_toEntityId_relationType: {
        fromEntityId: data.fromEntityId,
        toEntityId: data.toEntityId,
        relationType: data.relationType,
      },
    },
    update: {
      weight: data.weight,
      confidence: data.confidence,
      evidence: data.evidence as unknown as Prisma.InputJsonValue | undefined,
    },
    create: {
      fromEntityId: data.fromEntityId,
      toEntityId: data.toEntityId,
      relationType: data.relationType,
      weight: data.weight ?? 1.0,
      confidence: data.confidence ?? 1.0,
      evidence: (data.evidence ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
}

export interface IncrementRelationWeightInput {
  fromEntityId: string;
  toEntityId: string;
  relationType: RelationType;
  increment: number;
}

export function incrementRelationWeight(
  db: Database,
  input: IncrementRelationWeightInput
) {
  return db.entityRelation.update({
    where: {
      fromEntityId_toEntityId_relationType: {
        fromEntityId: input.fromEntityId,
        toEntityId: input.toEntityId,
        relationType: input.relationType,
      },
    },
    data: {
      weight: { increment: input.increment },
    },
  });
}

export function deleteEntityRelation(db: Database, id: string) {
  return db.entityRelation.delete({ where: { id } });
}

export interface CreateEntityMentionInput {
  entityId: string;
  documentId: string;
  teamId: string;
  mentionText: string;
  context?: string;
  startOffset?: number;
  endOffset?: number;
  confidence?: number;
  source: string;
}

export function createEntityMention(
  db: Database,
  data: CreateEntityMentionInput
) {
  return db.entityMention.create({
    data: {
      entityId: data.entityId,
      documentId: data.documentId,
      teamId: data.teamId,
      mentionText: data.mentionText,
      context: data.context,
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      confidence: data.confidence ?? 1.0,
      source: data.source,
    },
  });
}

export function createManyEntityMentions(
  db: Database,
  data: CreateEntityMentionInput[]
) {
  return db.entityMention.createMany({
    data: data.map((d) => ({
      entityId: d.entityId,
      documentId: d.documentId,
      teamId: d.teamId,
      mentionText: d.mentionText,
      context: d.context,
      startOffset: d.startOffset,
      endOffset: d.endOffset,
      confidence: d.confidence ?? 1.0,
      source: d.source,
    })),
    skipDuplicates: true,
  });
}

export function deleteEntityMentionsByDocument(
  db: Database,
  documentId: string
) {
  return db.entityMention.deleteMany({ where: { documentId } });
}

export interface CreateTopicClusterInput {
  teamId: string;
  name: string;
  description?: string;
  parentId?: string;
  embedding?: Uint8Array;
}

export function createTopicCluster(
  db: Database,
  data: CreateTopicClusterInput
) {
  return db.topicCluster.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      embedding: data.embedding as Prisma.TopicClusterCreateInput["embedding"],
    },
  });
}

export function updateTopicClusterDocumentCount(
  db: Database,
  id: string,
  documentCount: number
) {
  return db.topicCluster.update({
    where: { id },
    data: { documentCount },
  });
}

export function incrementTopicClusterDocumentCount(db: Database, id: string) {
  return db.topicCluster.update({
    where: { id },
    data: { documentCount: { increment: 1 } },
  });
}

export function deleteTopicCluster(db: Database, id: string) {
  return db.topicCluster.delete({ where: { id } });
}

export function batchUpsertEntities(
  db: Database,
  entities: UpsertEntityInput[]
) {
  return db.$transaction(
    entities.map((data) =>
      db.entity.upsert({
        where: {
          teamId_type_normalizedName: {
            teamId: data.teamId,
            type: data.type,
            normalizedName: data.normalizedName,
          },
        },
        update: {
          aliases: data.aliases,
          description: data.description,
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
          externalId: data.externalId,
          externalSource: data.externalSource,
        },
        create: {
          teamId: data.teamId,
          type: data.type,
          name: data.name,
          normalizedName: data.normalizedName,
          aliases: data.aliases ?? [],
          description: data.description,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
          externalId: data.externalId,
          externalSource: data.externalSource,
        },
      })
    )
  );
}

export function batchUpsertEntityRelations(
  db: Database,
  relations: UpsertEntityRelationInput[]
) {
  return db.$transaction(
    relations.map((data) =>
      db.entityRelation.upsert({
        where: {
          fromEntityId_toEntityId_relationType: {
            fromEntityId: data.fromEntityId,
            toEntityId: data.toEntityId,
            relationType: data.relationType,
          },
        },
        update: {
          weight: data.weight,
          confidence: data.confidence,
          evidence: data.evidence as unknown as
            | Prisma.InputJsonValue
            | undefined,
        },
        create: {
          fromEntityId: data.fromEntityId,
          toEntityId: data.toEntityId,
          relationType: data.relationType,
          weight: data.weight ?? 1.0,
          confidence: data.confidence ?? 1.0,
          evidence: (data.evidence ?? []) as unknown as Prisma.InputJsonValue,
        },
      })
    )
  );
}
