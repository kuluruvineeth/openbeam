/**
 * Entity Client
 *
 * Client for entity schema operations.
 * Handles knowledge graph entities: users, channels, groups, projects, etc.
 */

import type {
  Entity,
  EntityInput,
  EntitySearchOptions,
  EntityType,
  EntityUpdate,
  PaginatedResult,
  VespaHit,
} from "../types";
import { BaseVespaClient } from "./base-client";

const SCHEMA = "entity";
const NAMESPACE = "default";

export class EntityClient extends BaseVespaClient {
  // === CRUD Operations ===

  /**
   * Index an entity
   */
  async feed(entity: EntityInput) {
    const fields = {
      ...entity,
      created_at: entity.created_at || Date.now(),
      updated_at: entity.updated_at || Date.now(),
    };

    return await this.feedToSchema(
      { schema: SCHEMA, namespace: NAMESPACE, docId: entity.id },
      fields
    );
  }

  /**
   * Bulk index entities
   */
  async feedBatch(
    entities: EntityInput[],
    options: {
      concurrency?: number;
      onProgress?: (indexed: number, total: number) => void;
    } = {}
  ) {
    return await this.feedBatchItems(entities, (e) => this.feed(e), options);
  }

  /**
   * Get an entity by ID
   */
  async get(id: string): Promise<Entity | null> {
    return await this.getFromSchema<Entity>(SCHEMA, NAMESPACE, id);
  }

  /**
   * Get entity by external ID
   */
  async getByExternalId(
    externalId: string,
    connectorId: string,
    teamId: string
  ): Promise<Entity | null> {
    const yql = `select * from ${SCHEMA} where external_id contains "${this.escape(externalId)}" and connector_id contains "${this.escape(connectorId)}" and team_id contains "${this.escape(teamId)}" limit 1`;

    const result = await this.query<Entity>(yql);
    return result.root.children?.[0]?.fields || null;
  }

  /**
   * Update an entity
   */
  async update(id: string, fields: EntityUpdate) {
    return await this.updateInSchema(SCHEMA, NAMESPACE, id, {
      ...fields,
      updated_at: fields.updated_at || Date.now(),
    });
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<void> {
    return await this.deleteFromSchema(SCHEMA, NAMESPACE, id);
  }

  // === Search Operations ===

  /**
   * Search entities with full options
   */
  async search(
    options: EntitySearchOptions
  ): Promise<PaginatedResult<VespaHit<Entity>>> {
    const conditions = this.buildSearchConditions(options);
    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")}`;

    const queryFeatures: Record<string, unknown> = {};
    if (options.embedding && options.embedding.length > 0) {
      queryFeatures["input.query(query_embedding)"] = {
        type: `tensor<float>(x[${options.embedding.length}])`,
        values: options.embedding,
      };
    }

    const result = await this.query<Entity>(yql, {
      ranking: options.rankProfile || "default",
      hits: options.limit || 20,
      offset: options.offset || 0,
      queryFeatures:
        Object.keys(queryFeatures).length > 0 ? queryFeatures : undefined,
    });

    return this.buildPaginatedResult(result, options);
  }

  /**
   * Search by name
   */
  async searchByName(
    name: string,
    teamId: string,
    options: { entityType?: EntityType | string; limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const result = await this.search({
      query: name,
      teamId,
      entityType: options.entityType,
      limit: options.limit,
      rankProfile: "by_name",
    });
    return result.items;
  }

  /**
   * Get entities by type
   */
  async getByType(
    entityType: EntityType | string,
    teamId: string,
    options: { limit?: number; offset?: number; isActive?: boolean } = {}
  ): Promise<PaginatedResult<VespaHit<Entity>>> {
    return await this.search({
      teamId,
      entityType,
      isActive: options.isActive,
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Get multiple entity types at once
   */
  async getByTypes(
    entityTypes: (EntityType | string)[],
    teamId: string,
    options: { limit?: number; isActive?: boolean } = {}
  ): Promise<VespaHit<Entity>[]> {
    const result = await this.search({
      teamId,
      entityTypes,
      isActive: options.isActive,
      limit: options.limit,
    });
    return result.items;
  }

  /**
   * Get channels for a team
   */
  async getChannels(
    teamId: string,
    options: { connectorId?: string; isActive?: boolean; limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const conditions = [
      `team_id contains "${this.escape(teamId)}"`,
      'entity_type contains "channel"',
    ];

    if (options.connectorId) {
      conditions.push(
        `connector_id contains "${this.escape(options.connectorId)}"`
      );
    }
    if (options.isActive !== undefined) {
      conditions.push(`is_active = ${options.isActive}`);
    }

    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")} order by activity_score desc limit ${options.limit || 100}`;

    const result = await this.query<Entity>(yql, { ranking: "active" });
    return result.root.children || [];
  }

  /**
   * Get groups for a team
   */
  async getGroups(
    teamId: string,
    options: { connectorId?: string; limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const conditions = [
      `team_id contains "${this.escape(teamId)}"`,
      'entity_type contains "group"',
    ];

    if (options.connectorId) {
      conditions.push(
        `connector_id contains "${this.escape(options.connectorId)}"`
      );
    }

    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")} order by member_count desc limit ${options.limit || 100}`;

    const result = await this.query<Entity>(yql);
    return result.root.children || [];
  }

  /**
   * Get child entities (for hierarchy navigation)
   */
  async getChildren(
    parentId: string,
    teamId: string,
    options: { entityType?: EntityType | string; limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const conditions = [
      `team_id contains "${this.escape(teamId)}"`,
      `parent_id contains "${this.escape(parentId)}"`,
    ];

    if (options.entityType) {
      conditions.push(
        `entity_type contains "${this.escape(options.entityType)}"`
      );
    }

    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")} limit ${options.limit || 100}`;

    const result = await this.query<Entity>(yql);
    return result.root.children || [];
  }

  /**
   * Get entities by tag
   */
  async getByTag(
    tag: string,
    teamId: string,
    options: { entityType?: EntityType | string; limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const conditions = [
      `team_id contains "${this.escape(teamId)}"`,
      `tags contains "${this.escape(tag)}"`,
    ];

    if (options.entityType) {
      conditions.push(
        `entity_type contains "${this.escape(options.entityType)}"`
      );
    }

    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")} limit ${options.limit || 50}`;

    const result = await this.query<Entity>(yql);
    return result.root.children || [];
  }

  /**
   * Get related entities
   */
  async getRelated(
    entityId: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const entity = await this.get(entityId);
    if (!entity?.related_entity_ids || entity.related_entity_ids.length === 0) {
      return [];
    }

    // Get related entities by IDs
    const relatedConditions = entity.related_entity_ids
      .slice(0, options.limit || 20)
      .map((id) => `id contains "${this.escape(id)}"`)
      .join(" or ");

    const yql = `select * from ${SCHEMA} where (${relatedConditions}) and team_id contains "${this.escape(teamId)}"`;

    const result = await this.query<Entity>(yql);
    return result.root.children || [];
  }

  /**
   * Find similar entities by embedding
   */
  async getSimilar(
    entityId: string,
    teamId: string,
    options: { limit?: number; entityType?: EntityType | string } = {}
  ): Promise<VespaHit<Entity>[]> {
    const entity = await this.get(entityId);
    if (!entity?.entity_embedding) {
      return [];
    }

    const limit = options.limit || 10;
    let yql = `select * from ${SCHEMA} where {targetHits:${limit + 1}}nearestNeighbor(entity_embedding, query_embedding) and team_id contains "${this.escape(teamId)}"`;

    if (options.entityType) {
      yql += ` and entity_type contains "${this.escape(options.entityType)}"`;
    }

    const result = await this.query<Entity>(yql, {
      ranking: "semantic",
      hits: limit + 1,
      queryFeatures: {
        "input.query(query_embedding)": {
          type: `tensor<float>(x[${entity.entity_embedding.length}])`,
          values: entity.entity_embedding,
        },
      },
    });

    return (result.root.children || [])
      .filter((e) => e.fields.id !== entityId)
      .slice(0, limit);
  }

  /**
   * Get most active entities
   */
  async getMostActive(
    teamId: string,
    options: { entityType?: EntityType | string; limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const conditions = [
      `team_id contains "${this.escape(teamId)}"`,
      "is_active = true",
    ];

    if (options.entityType) {
      conditions.push(
        `entity_type contains "${this.escape(options.entityType)}"`
      );
    }

    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")} limit ${options.limit || 20}`;

    const result = await this.query<Entity>(yql, { ranking: "active" });
    return result.root.children || [];
  }

  /**
   * Get most popular entities (by member count)
   */
  async getMostPopular(
    teamId: string,
    options: { entityType?: EntityType | string; limit?: number } = {}
  ): Promise<VespaHit<Entity>[]> {
    const conditions = [`team_id contains "${this.escape(teamId)}"`];

    if (options.entityType) {
      conditions.push(
        `entity_type contains "${this.escape(options.entityType)}"`
      );
    }

    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")} limit ${options.limit || 20}`;

    const result = await this.query<Entity>(yql, { ranking: "popular" });
    return result.root.children || [];
  }

  // === Metrics Updates ===

  /**
   * Update activity metrics
   */
  async updateActivityMetrics(
    id: string,
    metrics: {
      documentCount?: number;
      messageCount?: number;
      activityScore?: number;
    }
  ): Promise<void> {
    await this.update(id, {
      document_count: metrics.documentCount,
      message_count: metrics.messageCount,
      activity_score: metrics.activityScore,
      last_activity_at: Date.now(),
    });
  }

  /**
   * Update member count
   */
  async updateMemberCount(id: string, count: number): Promise<void> {
    await this.update(id, { member_count: count });
  }

  // === Helper Methods ===

  private buildSearchConditions(options: EntitySearchOptions): string[] {
    const conditions: string[] = [];

    // Required: team filter
    conditions.push(`team_id contains "${this.escape(options.teamId)}"`);

    // Text search
    if (options.query) {
      conditions.push(`(default contains "${this.escape(options.query)}")`);
    }

    // Single entity type
    if (options.entityType) {
      conditions.push(
        `entity_type contains "${this.escape(options.entityType)}"`
      );
    }

    // Multiple entity types
    if (options.entityTypes && options.entityTypes.length > 0) {
      const typeConditions = options.entityTypes
        .map((t) => `entity_type contains "${this.escape(t)}"`)
        .join(" or ");
      conditions.push(`(${typeConditions})`);
    }

    // Parent filter
    if (options.parentId) {
      conditions.push(`parent_id contains "${this.escape(options.parentId)}"`);
    }

    // Active filter
    if (options.isActive !== undefined) {
      conditions.push(`is_active = ${options.isActive}`);
    }

    // Tags filter
    if (options.tags && options.tags.length > 0) {
      const tagConditions = options.tags
        .map((t) => `tags contains "${this.escape(t)}"`)
        .join(" or ");
      conditions.push(`(${tagConditions})`);
    }

    return conditions;
  }
}

export const entityClient = new EntityClient();
