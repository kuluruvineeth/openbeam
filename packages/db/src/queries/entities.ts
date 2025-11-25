import type { Database } from "../index";

// === Entity Query Types ===

export type EntityType =
  | "PERSON"
  | "PROJECT"
  | "CHANNEL"
  | "REPOSITORY"
  | "TEAM"
  | "GROUP";

export type RelationshipType =
  | "AUTHORED"
  | "MENTIONED"
  | "REFERENCES"
  | "WORKS_ON"
  | "MEMBER_OF"
  | "OWNS"
  | "ASSIGNED_TO"
  | "REVIEWED"
  | "COMMENTED"
  | "REACTED";

export interface EntityResult {
  id: string;
  externalId: string;
  entityType: EntityType;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  connectorId: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelationshipResult {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  strength: number | null;
  metadata: Record<string, unknown>;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityWithRelationship {
  entity: EntityResult;
  relationship: RelationshipResult;
}

// === Entity Queries ===

/**
 * Find entity by connector and external ID
 */
export const findEntityByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<EntityResult | null> => {
  const entity = await db.entity.findFirst({
    where: {
      connectorId,
      externalId,
    },
  });

  if (!entity) {
    return null;
  }

  return {
    ...entity,
    metadata: entity.metadata as Record<string, unknown>,
  };
};

/**
 * Get entities by type for a team
 */
export const getEntitiesByType = async (
  db: Database,
  teamId: string,
  entityType: EntityType,
  options: { limit?: number; offset?: number } = {}
): Promise<{ entities: EntityResult[]; total: number }> => {
  const { limit = 100, offset = 0 } = options;

  const [entities, total] = await Promise.all([
    db.entity.findMany({
      where: {
        teamId,
        entityType,
      },
      take: limit,
      skip: offset,
      orderBy: { name: "asc" },
    }),
    db.entity.count({
      where: {
        teamId,
        entityType,
      },
    }),
  ]);

  return {
    entities: entities.map((e) => ({
      ...e,
      metadata: e.metadata as Record<string, unknown>,
    })),
    total,
  };
};

/**
 * Get entities by connector
 */
export const getEntitiesByConnector = async (
  db: Database,
  connectorId: string,
  options: { limit?: number; offset?: number; entityType?: EntityType } = {}
): Promise<{ entities: EntityResult[]; total: number }> => {
  const { limit = 100, offset = 0, entityType } = options;

  const where: { connectorId: string; entityType?: EntityType } = {
    connectorId,
  };
  if (entityType) {
    where.entityType = entityType;
  }

  const [entities, total] = await Promise.all([
    db.entity.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { name: "asc" },
    }),
    db.entity.count({ where }),
  ]);

  return {
    entities: entities.map((e) => ({
      ...e,
      metadata: e.metadata as Record<string, unknown>,
    })),
    total,
  };
};

/**
 * Get outgoing relationships for an entity
 */
export const getOutgoingRelationships = async (
  db: Database,
  entityId: string
): Promise<EntityWithRelationship[]> => {
  const relationships = await db.relationship.findMany({
    where: { sourceEntityId: entityId },
    include: { targetEntity: true },
  });

  return relationships.map((rel) => ({
    entity: {
      ...rel.targetEntity,
      metadata: rel.targetEntity.metadata as Record<string, unknown>,
    },
    relationship: {
      ...rel,
      metadata: rel.metadata as Record<string, unknown>,
    },
  }));
};

/**
 * Get incoming relationships for an entity
 */
export const getIncomingRelationships = async (
  db: Database,
  entityId: string
): Promise<EntityWithRelationship[]> => {
  const relationships = await db.relationship.findMany({
    where: { targetEntityId: entityId },
    include: { sourceEntity: true },
  });

  return relationships.map((rel) => ({
    entity: {
      ...rel.sourceEntity,
      metadata: rel.sourceEntity.metadata as Record<string, unknown>,
    },
    relationship: {
      ...rel,
      metadata: rel.metadata as Record<string, unknown>,
    },
  }));
};

/**
 * Get all relationships for an entity (both directions)
 */
export const getAllRelationships = async (
  db: Database,
  entityId: string
): Promise<{
  outgoing: EntityWithRelationship[];
  incoming: EntityWithRelationship[];
}> => {
  const [outgoing, incoming] = await Promise.all([
    getOutgoingRelationships(db, entityId),
    getIncomingRelationships(db, entityId),
  ]);

  return { outgoing, incoming };
};

/**
 * Find entities related to a document
 */
export const getDocumentEntities = async (
  db: Database,
  documentId: string,
  options: { limit?: number } = {}
): Promise<EntityResult[]> => {
  const { limit = 10 } = options;

  const documentEntities = await db.documentEntity.findMany({
    where: { documentId },
    include: { entity: true },
    take: limit,
  });

  return documentEntities.map((de) => ({
    ...de.entity,
    metadata: de.entity.metadata as Record<string, unknown>,
  }));
};

/**
 * Search entities by name
 */
export const searchEntities = async (
  db: Database,
  teamId: string,
  query: string,
  options: { limit?: number; entityTypes?: EntityType[] } = {}
): Promise<EntityResult[]> => {
  const { limit = 20, entityTypes } = options;

  const where: {
    teamId: string;
    name: { contains: string; mode: "insensitive" };
    entityType?: { in: EntityType[] };
  } = {
    teamId,
    name: { contains: query, mode: "insensitive" },
  };

  if (entityTypes && entityTypes.length > 0) {
    where.entityType = { in: entityTypes };
  }

  const entities = await db.entity.findMany({
    where,
    take: limit,
    orderBy: { name: "asc" },
  });

  return entities.map((e) => ({
    ...e,
    metadata: e.metadata as Record<string, unknown>,
  }));
};

/**
 * Get entity by ID
 */
export const getEntityById = async (
  db: Database,
  entityId: string
): Promise<EntityResult | null> => {
  const entity = await db.entity.findUnique({
    where: { id: entityId },
  });

  if (!entity) {
    return null;
  }

  return {
    ...entity,
    metadata: entity.metadata as Record<string, unknown>,
  };
};

/**
 * Count entities by type for a team
 */
export const countEntitiesByType = async (
  db: Database,
  teamId: string
): Promise<Record<EntityType, number>> => {
  const counts = await db.entity.groupBy({
    by: ["entityType"],
    where: { teamId },
    _count: { id: true },
  });

  const result: Record<EntityType, number> = {
    PERSON: 0,
    PROJECT: 0,
    CHANNEL: 0,
    REPOSITORY: 0,
    TEAM: 0,
    GROUP: 0,
  };

  for (const count of counts) {
    result[count.entityType as EntityType] = count._count.id;
  }

  return result;
};
