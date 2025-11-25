/**
 * Person Client
 *
 * Client for person schema operations.
 * Handles people search, expert finding, and org directory.
 */

import type {
  PaginatedResult,
  Person,
  PersonInput,
  PersonSearchOptions,
  PersonUpdate,
  VespaHit,
} from "../types";
import { BaseVespaClient } from "./base-client";

const SCHEMA = "person";
const NAMESPACE = "default";

export class PersonClient extends BaseVespaClient {
  // === CRUD Operations ===

  /**
   * Index a person
   */
  async feed(person: PersonInput) {
    const fields = {
      ...person,
      created_at: person.created_at || Date.now(),
      updated_at: person.updated_at || Date.now(),
    };

    return await this.feedToSchema(
      { schema: SCHEMA, namespace: NAMESPACE, docId: person.id },
      fields
    );
  }

  /**
   * Bulk index people
   */
  async feedBatch(
    people: PersonInput[],
    options: {
      concurrency?: number;
      onProgress?: (indexed: number, total: number) => void;
    } = {}
  ) {
    return await this.feedBatchItems(people, (p) => this.feed(p), options);
  }

  /**
   * Get a person by ID
   */
  async get(id: string): Promise<Person | null> {
    return await this.getFromSchema<Person>(SCHEMA, NAMESPACE, id);
  }

  /**
   * Get a person by email
   */
  async getByEmail(email: string, teamId: string): Promise<Person | null> {
    const yql = `select * from ${SCHEMA} where email contains "${this.escape(email)}" and team_id contains "${this.escape(teamId)}" limit 1`;
    const result = await this.query<Person>(yql);
    return result.root.children?.[0]?.fields || null;
  }

  /**
   * Update a person
   */
  async update(id: string, fields: PersonUpdate) {
    return await this.updateInSchema(SCHEMA, NAMESPACE, id, {
      ...fields,
      updated_at: fields.updated_at || Date.now(),
    });
  }

  /**
   * Delete a person
   */
  async delete(id: string): Promise<void> {
    return await this.deleteFromSchema(SCHEMA, NAMESPACE, id);
  }

  // === Search Operations ===

  /**
   * Search people with full options
   */
  async search(
    options: PersonSearchOptions
  ): Promise<PaginatedResult<VespaHit<Person>>> {
    const conditions = this.buildSearchConditions(options);
    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")}`;

    const queryFeatures: Record<string, unknown> = {};
    if (
      options.rankProfile === "semantic" ||
      options.rankProfile === "hybrid"
    ) {
      // For semantic search, we need an embedding - this should be passed in options
      // or derived from the query text externally
    }

    const result = await this.query<Person>(yql, {
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
    options: { limit?: number } = {}
  ): Promise<VespaHit<Person>[]> {
    const result = await this.search({
      query: name,
      teamId,
      limit: options.limit,
      rankProfile: "default",
    });
    return result.items;
  }

  /**
   * Find experts by skill
   */
  async findBySkill(
    skill: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<Person>[]> {
    const yql = `select * from ${SCHEMA} where skills contains "${this.escape(skill)}" and team_id contains "${this.escape(teamId)}" and is_active = true limit ${options.limit || 20}`;

    const result = await this.query<Person>(yql, { ranking: "skills" });
    return result.root.children || [];
  }

  /**
   * Find experts by skills (multiple)
   */
  async findBySkills(
    skills: string[],
    teamId: string,
    options: { limit?: number; matchAll?: boolean } = {}
  ): Promise<VespaHit<Person>[]> {
    const { matchAll = false, limit = 20 } = options;

    const skillConditions = skills.map(
      (s) => `skills contains "${this.escape(s)}"`
    );
    const operator = matchAll ? " and " : " or ";

    const yql = `select * from ${SCHEMA} where (${skillConditions.join(operator)}) and team_id contains "${this.escape(teamId)}" and is_active = true limit ${limit}`;

    const result = await this.query<Person>(yql, { ranking: "skills" });
    return result.root.children || [];
  }

  /**
   * Get people by department
   */
  async getByDepartment(
    department: string,
    teamId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResult<VespaHit<Person>>> {
    return await this.search({
      teamId,
      department,
      limit: options.limit,
      offset: options.offset,
      rankProfile: "organizational",
    });
  }

  /**
   * Get active contributors (most engaged people)
   */
  async getActiveContributors(
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<Person>[]> {
    const yql = `select * from ${SCHEMA} where team_id contains "${this.escape(teamId)}" and is_active = true and !is_bot limit ${options.limit || 20}`;

    const result = await this.query<Person>(yql, {
      ranking: "active_contributors",
    });
    return result.root.children || [];
  }

  /**
   * Get recently active people
   */
  async getRecentlyActive(
    teamId: string,
    options: { hours?: number; limit?: number } = {}
  ): Promise<VespaHit<Person>[]> {
    const { hours = 24, limit = 20 } = options;
    const fromTime = Date.now() - hours * 60 * 60 * 1000;

    const yql = `select * from ${SCHEMA} where team_id contains "${this.escape(teamId)}" and last_active_at >= ${fromTime} and is_active = true limit ${limit}`;

    const result = await this.query<Person>(yql, {
      ranking: "recently_active",
    });
    return result.root.children || [];
  }

  /**
   * Get similar people (by profile embedding)
   */
  async getSimilar(
    personId: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<Person>[]> {
    const person = await this.get(personId);
    if (!person?.profile_embedding) {
      return [];
    }

    const limit = options.limit || 10;
    const yql = `select * from ${SCHEMA} where {targetHits:${limit + 1}}nearestNeighbor(profile_embedding, query_embedding) and team_id contains "${this.escape(teamId)}" and is_active = true`;

    const result = await this.query<Person>(yql, {
      ranking: "semantic",
      hits: limit + 1,
      queryFeatures: {
        "input.query(query_embedding)": {
          type: `tensor<float>(x[${person.profile_embedding.length}])`,
          values: person.profile_embedding,
        },
      },
    });

    // Filter out self
    return (result.root.children || [])
      .filter((p) => p.fields.id !== personId)
      .slice(0, limit);
  }

  /**
   * Get direct reports for a manager
   */
  async getDirectReports(
    managerId: string,
    teamId: string
  ): Promise<VespaHit<Person>[]> {
    const yql = `select * from ${SCHEMA} where manager_id contains "${this.escape(managerId)}" and team_id contains "${this.escape(teamId)}" and is_active = true`;

    const result = await this.query<Person>(yql);
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
      contributionScore?: number;
    }
  ): Promise<void> {
    await this.update(id, {
      document_count: metrics.documentCount,
      message_count: metrics.messageCount,
      contribution_score: metrics.contributionScore,
      last_active_at: Date.now(),
    });
  }

  // === Helper Methods ===

  private buildSearchConditions(options: PersonSearchOptions): string[] {
    const conditions: string[] = [];

    // Required: team filter
    conditions.push(`team_id contains "${this.escape(options.teamId)}"`);

    // Text search
    if (options.query) {
      conditions.push(`(default contains "${this.escape(options.query)}")`);
    }

    // Filters
    if (options.department) {
      conditions.push(
        `department contains "${this.escape(options.department)}"`
      );
    }
    if (options.location) {
      conditions.push(`location contains "${this.escape(options.location)}"`);
    }
    if (options.isActive !== undefined) {
      conditions.push(`is_active = ${options.isActive}`);
    }
    if (options.excludeBots) {
      conditions.push("(is_bot = false or !is_bot)");
    }

    // Skills (any match)
    if (options.skills && options.skills.length > 0) {
      const skillConditions = options.skills
        .map((s) => `skills contains "${this.escape(s)}"`)
        .join(" or ");
      conditions.push(`(${skillConditions})`);
    }

    return conditions;
  }
}

export const personClient = new PersonClient();
