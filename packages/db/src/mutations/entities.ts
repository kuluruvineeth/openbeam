import type { Database } from "../index";
import type { EntityType, RelationshipType } from "../queries/entities";

// === Entity Mutation Types ===

export interface UpsertEntityInput {
  connectorId: string;
  teamId: string;
  externalId: string;
  entityType: EntityType;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpsertRelationshipInput {
  teamId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  strength?: number;
  metadata?: Record<string, unknown>;
}

export interface LinkDocumentToEntityInput {
  documentId: string;
  entityId: string;
  relationshipType?: string;
}

export interface UpsertResult {
  id: string;
  created: boolean;
}

// === Entity Mutations ===

/**
 * Upsert a single entity
 */
export const upsertEntity = async (
  db: Database,
  input: UpsertEntityInput
): Promise<UpsertResult> => {
  const result = await db.entity.upsert({
    where: {
      connectorId_externalId: {
        connectorId: input.connectorId,
        externalId: input.externalId,
      },
    },
    update: {
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl,
      metadata: input.metadata || {},
      updatedAt: new Date(),
    },
    create: {
      connectorId: input.connectorId,
      teamId: input.teamId,
      externalId: input.externalId,
      entityType: input.entityType,
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl,
      metadata: input.metadata || {},
    },
  });

  return {
    id: result.id,
    created: result.createdAt.getTime() === result.updatedAt.getTime(),
  };
};

/**
 * Bulk upsert entities
 */
export const bulkUpsertEntities = async (
  db: Database,
  entities: UpsertEntityInput[]
): Promise<{ created: number; updated: number }> => {
  let created = 0;
  let updated = 0;

  // Use transaction for consistency
  await db.$transaction(async (tx) => {
    for (const entity of entities) {
      const result = await tx.entity.upsert({
        where: {
          connectorId_externalId: {
            connectorId: entity.connectorId,
            externalId: entity.externalId,
          },
        },
        update: {
          name: entity.name,
          email: entity.email,
          avatarUrl: entity.avatarUrl,
          metadata: entity.metadata || {},
          updatedAt: new Date(),
        },
        create: {
          connectorId: entity.connectorId,
          teamId: entity.teamId,
          externalId: entity.externalId,
          entityType: entity.entityType,
          name: entity.name,
          email: entity.email,
          avatarUrl: entity.avatarUrl,
          metadata: entity.metadata || {},
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }
  });

  return { created, updated };
};

/**
 * Upsert a relationship between entities
 */
export const upsertRelationship = async (
  db: Database,
  input: UpsertRelationshipInput
): Promise<UpsertResult> => {
  const result = await db.relationship.upsert({
    where: {
      sourceEntityId_targetEntityId_relationshipType: {
        sourceEntityId: input.sourceEntityId,
        targetEntityId: input.targetEntityId,
        relationshipType: input.relationshipType,
      },
    },
    update: {
      strength: input.strength,
      metadata: input.metadata || {},
      updatedAt: new Date(),
    },
    create: {
      teamId: input.teamId,
      sourceEntityId: input.sourceEntityId,
      targetEntityId: input.targetEntityId,
      relationshipType: input.relationshipType,
      strength: input.strength || 1.0,
      metadata: input.metadata || {},
    },
  });

  return {
    id: result.id,
    created: result.createdAt.getTime() === result.updatedAt.getTime(),
  };
};

/**
 * Bulk upsert relationships
 */
export const bulkUpsertRelationships = async (
  db: Database,
  relationships: UpsertRelationshipInput[]
): Promise<{ created: number; updated: number }> => {
  let created = 0;
  let updated = 0;

  await db.$transaction(async (tx) => {
    for (const rel of relationships) {
      const result = await tx.relationship.upsert({
        where: {
          sourceEntityId_targetEntityId_relationshipType: {
            sourceEntityId: rel.sourceEntityId,
            targetEntityId: rel.targetEntityId,
            relationshipType: rel.relationshipType,
          },
        },
        update: {
          strength: rel.strength,
          metadata: rel.metadata || {},
          updatedAt: new Date(),
        },
        create: {
          teamId: rel.teamId,
          sourceEntityId: rel.sourceEntityId,
          targetEntityId: rel.targetEntityId,
          relationshipType: rel.relationshipType,
          strength: rel.strength || 1.0,
          metadata: rel.metadata || {},
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }
  });

  return { created, updated };
};

/**
 * Link a document to an entity
 */
export const linkDocumentToEntity = async (
  db: Database,
  input: LinkDocumentToEntityInput
): Promise<void> => {
  await db.documentEntity.upsert({
    where: {
      documentId_entityId: {
        documentId: input.documentId,
        entityId: input.entityId,
      },
    },
    update: {
      relationshipType: input.relationshipType || "mentioned",
      updatedAt: new Date(),
    },
    create: {
      documentId: input.documentId,
      entityId: input.entityId,
      relationshipType: input.relationshipType || "mentioned",
    },
  });
};

/**
 * Bulk link documents to entities
 */
export const bulkLinkDocumentToEntities = async (
  db: Database,
  documentId: string,
  entityIds: string[],
  relationshipType = "mentioned"
): Promise<number> => {
  let linked = 0;

  await db.$transaction(async (tx) => {
    for (const entityId of entityIds) {
      await tx.documentEntity.upsert({
        where: {
          documentId_entityId: {
            documentId,
            entityId,
          },
        },
        update: {
          relationshipType,
          updatedAt: new Date(),
        },
        create: {
          documentId,
          entityId,
          relationshipType,
        },
      });
      linked++;
    }
  });

  return linked;
};

/**
 * Delete entity by ID
 */
export const deleteEntity = async (
  db: Database,
  entityId: string
): Promise<boolean> => {
  try {
    await db.entity.delete({
      where: { id: entityId },
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Delete all entities for a connector
 */
export const deleteConnectorEntities = async (
  db: Database,
  connectorId: string
): Promise<number> => {
  const result = await db.entity.deleteMany({
    where: { connectorId },
  });

  return result.count;
};

/**
 * Delete a relationship
 */
export const deleteRelationship = async (
  db: Database,
  relationshipId: string
): Promise<boolean> => {
  try {
    await db.relationship.delete({
      where: { id: relationshipId },
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Delete all relationships for a team
 */
export const deleteTeamRelationships = async (
  db: Database,
  teamId: string
): Promise<number> => {
  const result = await db.relationship.deleteMany({
    where: { teamId },
  });

  return result.count;
};

/**
 * Unlink document from entity
 */
export const unlinkDocumentFromEntity = async (
  db: Database,
  documentId: string,
  entityId: string
): Promise<boolean> => {
  try {
    await db.documentEntity.delete({
      where: {
        documentId_entityId: {
          documentId,
          entityId,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Update entity metadata
 */
export const updateEntityMetadata = async (
  db: Database,
  entityId: string,
  metadata: Record<string, unknown>
): Promise<void> => {
  await db.entity.update({
    where: { id: entityId },
    data: {
      metadata,
      updatedAt: new Date(),
    },
  });
};
