import type { EntityType, RelationType } from "../../prisma/generated/client";
import type { Database } from "../index";

export function getEntityById(db: Database, id: string) {
  return db.entity.findUnique({ where: { id } });
}

export function getEntityByNormalizedName(
  db: Database,
  teamId: string,
  type: EntityType,
  normalizedName: string
) {
  return db.entity.findUnique({
    where: {
      teamId_type_normalizedName: { teamId, type, normalizedName },
    },
  });
}

export function getEntityByExternalId(
  db: Database,
  teamId: string,
  externalSource: string,
  externalId: string
) {
  return db.entity.findUnique({
    where: {
      teamId_externalSource_externalId: { teamId, externalSource, externalId },
    },
  });
}

export function findEntityByAlias(
  db: Database,
  teamId: string,
  type: EntityType,
  alias: string
) {
  return db.entity.findFirst({
    where: {
      teamId,
      type,
      aliases: { has: alias },
    },
  });
}

export interface ListEntitiesOptions {
  teamId: string;
  type?: EntityType;
  cursor?: string;
  limit?: number;
}

export async function listEntities(db: Database, options: ListEntitiesOptions) {
  const limit = options.limit ?? 20;

  const entities = await db.entity.findMany({
    where: {
      teamId: options.teamId,
      ...(options.type && { type: options.type }),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor && {
      cursor: { id: options.cursor },
      skip: 1,
    }),
  });

  const hasMore = entities.length > limit;
  const items = hasMore ? entities.slice(0, -1) : entities;
  const nextCursor = hasMore ? items.at(-1)?.id : undefined;

  return { items, nextCursor, hasMore };
}

export interface SearchEntitiesOptions {
  teamId: string;
  query: string;
  type?: EntityType;
  limit?: number;
}

export function searchEntities(db: Database, options: SearchEntitiesOptions) {
  const normalizedQuery = options.query.toLowerCase().trim();
  const limit = options.limit ?? 10;

  return db.entity.findMany({
    where: {
      teamId: options.teamId,
      ...(options.type && { type: options.type }),
      OR: [
        { normalizedName: { contains: normalizedQuery } },
        { aliases: { hasSome: [normalizedQuery] } },
      ],
    },
    orderBy: { expertiseScore: "desc" },
    take: limit,
  });
}

export function getEntitiesByType(
  db: Database,
  teamId: string,
  type: EntityType,
  limit = 100
) {
  return db.entity.findMany({
    where: { teamId, type },
    orderBy: { expertiseScore: "desc" },
    take: limit,
  });
}

export function getTopExpertsByTeam(db: Database, teamId: string, limit = 20) {
  return db.entity.findMany({
    where: {
      teamId,
      type: "PERSON",
      expertiseScore: { gt: 0 },
    },
    orderBy: { expertiseScore: "desc" },
    take: limit,
  });
}

export function getEntityRelationById(db: Database, id: string) {
  return db.entityRelation.findUnique({
    where: { id },
    include: { fromEntity: true, toEntity: true },
  });
}

export interface GetEntityRelationsOptions {
  entityId: string;
  direction?: "outgoing" | "incoming" | "both";
  relationType?: RelationType;
  limit?: number;
}

export async function getEntityRelations(
  db: Database,
  options: GetEntityRelationsOptions
) {
  const limit = options.limit ?? 50;
  const direction = options.direction ?? "both";

  const outgoing =
    direction === "outgoing" || direction === "both"
      ? await db.entityRelation.findMany({
          where: {
            fromEntityId: options.entityId,
            ...(options.relationType && { relationType: options.relationType }),
          },
          include: { toEntity: true },
          orderBy: { weight: "desc" },
          take: limit,
        })
      : [];

  const incoming =
    direction === "incoming" || direction === "both"
      ? await db.entityRelation.findMany({
          where: {
            toEntityId: options.entityId,
            ...(options.relationType && { relationType: options.relationType }),
          },
          include: { fromEntity: true },
          orderBy: { weight: "desc" },
          take: limit,
        })
      : [];

  return { outgoing, incoming };
}

export function getExpertiseRelations(
  db: Database,
  personId: string,
  limit = 20
) {
  return db.entityRelation.findMany({
    where: {
      fromEntityId: personId,
      relationType: "EXPERT_IN",
    },
    include: { toEntity: true },
    orderBy: { weight: "desc" },
    take: limit,
  });
}

export function getExpertsForTopic(db: Database, topicId: string, limit = 10) {
  return db.entityRelation.findMany({
    where: {
      toEntityId: topicId,
      relationType: "EXPERT_IN",
    },
    include: { fromEntity: true },
    orderBy: { weight: "desc" },
    take: limit,
  });
}

export function getEntityMentionsByDocument(db: Database, documentId: string) {
  return db.entityMention.findMany({
    where: { documentId },
    include: { entity: true },
  });
}

export function getEntityMentions(db: Database, entityId: string, limit = 50) {
  return db.entityMention.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function countEntityMentions(db: Database, entityId: string) {
  return db.entityMention.count({ where: { entityId } });
}

export function getTopicClusterById(db: Database, id: string) {
  return db.topicCluster.findUnique({ where: { id } });
}

export function getTopicClusterByName(
  db: Database,
  teamId: string,
  name: string
) {
  return db.topicCluster.findUnique({
    where: { teamId_name: { teamId, name } },
  });
}

export function listTopicClusters(
  db: Database,
  teamId: string,
  parentId?: string
) {
  return db.topicCluster.findMany({
    where: {
      teamId,
      parentId: parentId ?? null,
    },
    orderBy: { documentCount: "desc" },
    include: { children: true },
  });
}

export function getTopicClusterHierarchy(db: Database, teamId: string) {
  return db.topicCluster.findMany({
    where: { teamId, parentId: null },
    include: {
      children: {
        include: {
          children: true,
        },
      },
    },
    orderBy: { documentCount: "desc" },
  });
}

const DEFAULT_RESOLUTION_LIMIT = 10_000;

export function getAllEntitiesForResolution(
  db: Database,
  teamId: string,
  limit = DEFAULT_RESOLUTION_LIMIT
) {
  return db.entity.findMany({
    where: { teamId },
    select: {
      id: true,
      type: true,
      name: true,
      normalizedName: true,
      aliases: true,
    },
    orderBy: [{ mentionCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
