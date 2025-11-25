/**
 * Entity Service
 *
 * Handles entity extraction, storage, and relationship mapping
 * for the knowledge graph functionality.
 *
 * This service uses the @openplane/db queries and mutations for
 * clean separation and reusability across layers.
 */
import prisma, {
  bulkLinkDocumentToEntities,
  bulkUpsertEntities,
  bulkUpsertRelationships,
  deleteConnectorEntities,
  type EntityType,
  findEntityByExternalId,
  getAllRelationships,
  getDocumentEntities,
  getEntitiesByType,
  type RelationshipType,
  type UpsertEntityInput,
  type UpsertRelationshipInput,
} from "@openplane/db";
import type {
  ExtractedEntity,
  ExtractedRelationship,
} from "../connectors/base-connector";
import logger from "../utils/logger";

// === Entity Service ===

class EntityService {
  /**
   * Upsert entities from a connector sync
   */
  async upsertEntities(
    connectorId: string,
    teamId: string,
    entities: ExtractedEntity[]
  ): Promise<{ created: number; updated: number }> {
    const inputs: UpsertEntityInput[] = entities.map((entity) => ({
      connectorId,
      teamId,
      externalId: entity.externalId,
      entityType: entity.entityType.toUpperCase() as EntityType,
      name: entity.name,
      email: entity.email,
      avatarUrl: entity.avatarUrl,
      metadata: entity.metadata,
    }));

    try {
      const result = await bulkUpsertEntities(prisma, inputs);

      logger.info(
        {
          connectorId,
          created: result.created,
          updated: result.updated,
          total: entities.length,
        },
        "Entities upserted"
      );

      return result;
    } catch (error) {
      logger.error({ error, connectorId }, "Failed to upsert entities");
      return { created: 0, updated: 0 };
    }
  }

  /**
   * Upsert relationships from a connector sync
   */
  async upsertRelationships(
    connectorId: string,
    teamId: string,
    relationships: ExtractedRelationship[]
  ): Promise<{ created: number; updated: number }> {
    const inputs: UpsertRelationshipInput[] = [];

    for (const rel of relationships) {
      try {
        // Find source and target entities
        const sourceEntity = await findEntityByExternalId(
          prisma,
          connectorId,
          rel.sourceExternalId
        );

        const targetEntity = await findEntityByExternalId(
          prisma,
          connectorId,
          rel.targetExternalId
        );

        if (!(sourceEntity && targetEntity)) {
          logger.debug(
            { rel },
            "Skipping relationship - source or target entity not found"
          );
          continue;
        }

        inputs.push({
          teamId,
          sourceEntityId: sourceEntity.id,
          targetEntityId: targetEntity.id,
          relationshipType:
            rel.relationshipType.toUpperCase() as RelationshipType,
          strength: rel.strength,
          metadata: rel.metadata,
        });
      } catch (error) {
        logger.error(
          { error, relationship: rel },
          "Failed to prepare relationship"
        );
      }
    }

    if (inputs.length === 0) {
      return { created: 0, updated: 0 };
    }

    try {
      const result = await bulkUpsertRelationships(prisma, inputs);

      logger.info(
        {
          connectorId,
          created: result.created,
          updated: result.updated,
          total: relationships.length,
        },
        "Relationships upserted"
      );

      return result;
    } catch (error) {
      logger.error({ error, connectorId }, "Failed to upsert relationships");
      return { created: 0, updated: 0 };
    }
  }

  /**
   * Get entities by type for a team
   */
  async getEntitiesByType(
    teamId: string,
    entityType: string,
    limit = 100,
    offset = 0
  ): Promise<ExtractedEntity[]> {
    const result = await getEntitiesByType(
      prisma,
      teamId,
      entityType.toUpperCase() as EntityType,
      { limit, offset }
    );

    return result.entities.map((e) => ({
      externalId: e.externalId,
      entityType: e.entityType.toLowerCase() as ExtractedEntity["entityType"],
      name: e.name,
      email: e.email || undefined,
      avatarUrl: e.avatarUrl || undefined,
      metadata: e.metadata,
    }));
  }

  /**
   * Get relationships for an entity
   */
  async getEntityRelationships(
    entityId: string,
    direction: "outgoing" | "incoming" | "both" = "both"
  ): Promise<
    Array<{
      relationship: ExtractedRelationship;
      relatedEntity: ExtractedEntity;
    }>
  > {
    const { outgoing, incoming } = await getAllRelationships(prisma, entityId);

    const results: Array<{
      relationship: ExtractedRelationship;
      relatedEntity: ExtractedEntity;
    }> = [];

    if (direction === "outgoing" || direction === "both") {
      for (const item of outgoing) {
        results.push({
          relationship: {
            sourceExternalId: entityId,
            sourceType: "entity",
            targetExternalId: item.entity.externalId,
            targetType: item.entity.entityType.toLowerCase(),
            relationshipType:
              item.relationship.relationshipType.toLowerCase() as ExtractedRelationship["relationshipType"],
            strength: item.relationship.strength || undefined,
            metadata: item.relationship.metadata,
          },
          relatedEntity: {
            externalId: item.entity.externalId,
            entityType:
              item.entity.entityType.toLowerCase() as ExtractedEntity["entityType"],
            name: item.entity.name,
            email: item.entity.email || undefined,
            avatarUrl: item.entity.avatarUrl || undefined,
          },
        });
      }
    }

    if (direction === "incoming" || direction === "both") {
      for (const item of incoming) {
        results.push({
          relationship: {
            sourceExternalId: item.entity.externalId,
            sourceType: item.entity.entityType.toLowerCase(),
            targetExternalId: entityId,
            targetType: "entity",
            relationshipType:
              item.relationship.relationshipType.toLowerCase() as ExtractedRelationship["relationshipType"],
            strength: item.relationship.strength || undefined,
            metadata: item.relationship.metadata,
          },
          relatedEntity: {
            externalId: item.entity.externalId,
            entityType:
              item.entity.entityType.toLowerCase() as ExtractedEntity["entityType"],
            name: item.entity.name,
            email: item.entity.email || undefined,
            avatarUrl: item.entity.avatarUrl || undefined,
          },
        });
      }
    }

    return results;
  }

  /**
   * Find entities related to a document
   */
  async findRelatedEntities(
    documentId: string,
    limit = 10
  ): Promise<ExtractedEntity[]> {
    const entities = await getDocumentEntities(prisma, documentId, { limit });

    return entities.map((e) => ({
      externalId: e.externalId,
      entityType: e.entityType.toLowerCase() as ExtractedEntity["entityType"],
      name: e.name,
      email: e.email || undefined,
      avatarUrl: e.avatarUrl || undefined,
    }));
  }

  /**
   * Link document to entities
   */
  async linkDocumentToEntities(
    documentId: string,
    entityExternalIds: string[],
    connectorId: string,
    relationshipType = "mentioned"
  ): Promise<number> {
    // First find the entity IDs
    const entityIds: string[] = [];

    for (const externalId of entityExternalIds) {
      const entity = await findEntityByExternalId(
        prisma,
        connectorId,
        externalId
      );
      if (entity) {
        entityIds.push(entity.id);
      }
    }

    if (entityIds.length === 0) {
      return 0;
    }

    try {
      const linked = await bulkLinkDocumentToEntities(
        prisma,
        documentId,
        entityIds,
        relationshipType
      );

      return linked;
    } catch (error) {
      logger.error(
        { error, documentId, entityExternalIds },
        "Failed to link document to entities"
      );
      return 0;
    }
  }

  /**
   * Delete entities for a connector (on disconnect)
   */
  async deleteConnectorEntities(connectorId: string): Promise<number> {
    const count = await deleteConnectorEntities(prisma, connectorId);

    logger.info(
      { connectorId, deleted: count },
      "Entities deleted for connector"
    );

    return count;
  }
}

// Export singleton
export const entityService = new EntityService();
