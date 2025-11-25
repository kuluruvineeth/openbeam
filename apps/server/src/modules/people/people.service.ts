/**
 * People/Directory Service
 * Business logic for people/directory operations
 *
 * Uses @openplane/vespa personClient and documentClient for clean, type-safe operations.
 */

import {
  documentClient,
  type Person,
  type PersonSearchOptions,
  personClient,
  type VespaHit,
} from "@openplane/vespa";
import type { PersonDetail, PersonSummary } from "@/types/api";

// ============================================================================
// Types
// ============================================================================

export interface ListPeopleParams {
  teamId: string;
  query?: string;
  department?: string;
  connectorType?: string;
  connectorId?: string;
  excludeBots?: boolean;
  limit: number;
  offset: number;
  sortBy: "name" | "documentCount" | "lastActiveAt";
  sortOrder: "asc" | "desc";
}

// ============================================================================
// Service Class
// ============================================================================

export class PeopleService {
  /**
   * List people with filtering and pagination
   * Uses personClient.search for type-safe queries
   */
  async listPeople(
    params: ListPeopleParams
  ): Promise<{ people: PersonSummary[]; total: number }> {
    // Build search options for personClient
    const searchOptions: PersonSearchOptions = {
      teamId: params.teamId,
      query: params.query,
      department: params.department,
      excludeBots: params.excludeBots,
      limit: params.limit,
      offset: params.offset,
      rankProfile: this.mapSortByToRankProfile(params.sortBy),
    };

    const result = await personClient.search(searchOptions);

    // Sort in memory if needed
    let items = result.items;
    if (params.sortBy === "name") {
      items = this.sortByName(items, params.sortOrder);
    }

    const people = this.mapVespaHitsToSummaries(items);

    return { people, total: result.total };
  }

  /**
   * Search people by query
   * Uses personClient.searchByName
   */
  async searchPeople(
    query: string,
    teamId: string,
    limit: number
  ): Promise<{ people: PersonSummary[]; total: number }> {
    const results = await personClient.searchByName(query, teamId, { limit });
    const people = this.mapVespaHitsToSummaries(results);

    return { people, total: people.length };
  }

  /**
   * Get person by ID
   * Uses personClient.get
   */
  async getPerson(
    personId: string,
    teamId: string
  ): Promise<PersonDetail | null> {
    const person = await personClient.get(personId);

    if (!person) {
      return null;
    }

    // Verify team ownership
    if (person.team_id !== teamId) {
      return null;
    }

    return this.mapPersonToDetail(person);
  }

  /**
   * Get person by email
   * Uses personClient.getByEmail
   */
  async getPersonByEmail(
    email: string,
    teamId: string
  ): Promise<PersonDetail | null> {
    const person = await personClient.getByEmail(email, teamId);

    if (!person) {
      return null;
    }

    return this.mapPersonToDetail(person);
  }

  /**
   * Get person's org chart
   * Uses personClient.getDirectReports
   */
  async getOrgChart(
    personId: string,
    teamId: string,
    _depth: number
  ): Promise<{
    person: PersonSummary;
    manager?: PersonSummary;
    directReports: PersonSummary[];
  } | null> {
    const person = await this.getPerson(personId, teamId);
    if (!person) {
      return null;
    }

    // Get manager if available
    let manager: PersonSummary | undefined;
    if (person.manager) {
      manager = person.manager;
    }

    // Get direct reports using personClient
    const directReportsHits = await personClient.getDirectReports(
      personId,
      teamId
    );
    const directReports = this.mapVespaHitsToSummaries(directReportsHits);

    return {
      person: this.detailToSummary(person),
      manager,
      directReports,
    };
  }

  /**
   * Get person's documents
   * Uses documentClient.getByAuthor
   */
  async getPersonDocuments(
    personId: string,
    teamId: string,
    options: {
      limit?: number;
      offset?: number;
      accessControlIds?: string[];
    } = {}
  ): Promise<{
    documents: Array<{
      id: string;
      title: string;
      documentType: string;
      connectorType: string;
      url?: string;
      createdAt: number;
    }>;
    total: number;
    documentTypeBreakdown: Array<{ type: string; count: number }>;
  }> {
    const { limit = 20, offset = 0, accessControlIds } = options;
    const result = await documentClient.getByAuthor(personId, teamId, {
      limit: limit + 20, // Get extra for filtering
      offset,
    });

    // Filter by access control
    const filtered = result.items.filter((hit) => {
      if (hit.fields.is_public) {
        return true;
      }
      if (!accessControlIds || accessControlIds.length === 0) {
        return false;
      }
      const acl = hit.fields.access_control || [];
      return accessControlIds.some((id) => acl.includes(id));
    });

    const documents = filtered.slice(0, limit).map((hit) => ({
      id: hit.fields.id,
      title: hit.fields.title || "Untitled",
      documentType: hit.fields.document_type || "document",
      connectorType: hit.fields.connector_type || "UNKNOWN",
      url: hit.fields.url,
      createdAt: hit.fields.created_at || Date.now(),
    }));

    // Calculate type breakdown
    const typeCount = new Map<string, number>();
    for (const doc of documents) {
      const count = typeCount.get(doc.documentType) || 0;
      typeCount.set(doc.documentType, count + 1);
    }

    const documentTypeBreakdown = Array.from(typeCount.entries()).map(
      ([type, count]) => ({ type, count })
    );

    return { documents, total: result.total, documentTypeBreakdown };
  }

  /**
   * Get person's activity
   * Uses documentClient for aggregations
   */
  async getPersonActivity(
    personId: string,
    teamId: string,
    period: "7d" | "30d" | "90d" | "1y"
  ): Promise<{
    metrics: {
      documentsCreated: number;
      messagesPosted: number;
      reactionsGiven: number;
      activeChannels: number;
    };
    activityOverTime: Array<{ date: string; count: number }>;
    topChannels: Array<{ id: string; name: string; messageCount: number }>;
  }> {
    const hours = this.periodToHours(period);

    // Get recent documents by this author
    const recentDocs = await documentClient.getRecent(teamId, {
      hours,
      limit: 1000, // Get enough to calculate stats
    });

    // Filter to just this author
    const authorDocs = recentDocs.filter(
      (hit) => hit.fields.author_id === personId
    );

    // Count documents and messages
    const documentsCreated = authorDocs.length;
    const messagesPosted = authorDocs.filter(
      (hit) => hit.fields.document_type === "message"
    ).length;

    // Get unique channels
    const channels = new Set(
      authorDocs
        .filter((hit) => hit.fields.source_id)
        .map((hit) => hit.fields.source_id)
    );

    return {
      metrics: {
        documentsCreated,
        messagesPosted,
        reactionsGiven: 0, // Would need separate reactions tracking
        activeChannels: channels.size,
      },
      activityOverTime: [], // Would need time-series aggregation
      topChannels: [], // Would need channel aggregation with names
    };
  }

  /**
   * Find people by skills
   * Uses personClient.findBySkills
   */
  async findBySkills(
    skills: string[],
    teamId: string,
    options?: { limit?: number; matchAll?: boolean }
  ): Promise<PersonSummary[]> {
    const results = await personClient.findBySkills(skills, teamId, options);
    return this.mapVespaHitsToSummaries(results);
  }

  /**
   * Get active contributors
   * Uses personClient.getActiveContributors
   */
  async getActiveContributors(
    teamId: string,
    options?: { limit?: number }
  ): Promise<PersonSummary[]> {
    const results = await personClient.getActiveContributors(teamId, options);
    return this.mapVespaHitsToSummaries(results);
  }

  /**
   * Get recently active people
   * Uses personClient.getRecentlyActive
   */
  async getRecentlyActive(
    teamId: string,
    options?: { hours?: number; limit?: number }
  ): Promise<PersonSummary[]> {
    const results = await personClient.getRecentlyActive(teamId, options);
    return this.mapVespaHitsToSummaries(results);
  }

  /**
   * Get similar people
   * Uses personClient.getSimilar
   */
  async getSimilarPeople(
    personId: string,
    teamId: string,
    options?: { limit?: number }
  ): Promise<PersonSummary[]> {
    const results = await personClient.getSimilar(personId, teamId, options);
    return this.mapVespaHitsToSummaries(results);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapSortByToRankProfile(
    sortBy: string
  ): "default" | "organizational" | "skills" | "recently_active" {
    const mapping: Record<
      string,
      "default" | "organizational" | "skills" | "recently_active"
    > = {
      name: "default",
      documentCount: "default",
      lastActiveAt: "recently_active",
    };
    return mapping[sortBy] || "default";
  }

  private sortByName(
    items: VespaHit<Person>[],
    order: "asc" | "desc"
  ): VespaHit<Person>[] {
    return [...items].sort((a, b) => {
      const nameA = (a.fields.name || "").toLowerCase();
      const nameB = (b.fields.name || "").toLowerCase();
      const comparison = nameA.localeCompare(nameB);
      return order === "asc" ? comparison : -comparison;
    });
  }

  private periodToHours(period: string): number {
    const periods: Record<string, number> = {
      "7d": 7 * 24,
      "30d": 30 * 24,
      "90d": 90 * 24,
      "1y": 365 * 24,
    };
    return periods[period] || periods["30d"];
  }

  private mapVespaHitsToSummaries(hits: VespaHit<Person>[]): PersonSummary[] {
    return hits.map((hit) => this.mapVespaHitToSummary(hit));
  }

  private mapVespaHitToSummary(hit: VespaHit<Person>): PersonSummary {
    return this.mapPersonToSummary(hit.fields);
  }

  private mapPersonToSummary(person: Person): PersonSummary {
    return {
      id: person.id,
      name: person.name || "Unknown",
      email: person.email,
      avatar: person.avatar_url,
      title: person.job_title,
      department: person.department,
      connectorType: person.connector_type || "UNKNOWN",
      connectorId: person.connector_id || "",
      isBot: person.is_bot,
      documentCount: person.document_count,
      lastActiveAt: person.last_active_at,
    };
  }

  private mapPersonToDetail(person: Person): PersonDetail {
    return {
      id: person.id,
      name: person.name || "Unknown",
      email: person.email,
      avatar: person.avatar_url,
      title: person.job_title,
      department: person.department,
      connectorType: person.connector_type || "UNKNOWN",
      connectorId: person.connector_id || "",
      isBot: person.is_bot,
      documentCount: person.document_count,
      lastActiveAt: person.last_active_at,
      bio: person.bio,
      phone: person.phone,
      location: person.location,
      timezone: person.timezone,
      skills: person.skills,
      teams: person.teams,
      activityScore: person.contribution_score,
    };
  }

  private detailToSummary(detail: PersonDetail): PersonSummary {
    return {
      id: detail.id,
      name: detail.name,
      email: detail.email,
      avatar: detail.avatar,
      title: detail.title,
      department: detail.department,
      connectorType: detail.connectorType,
      connectorId: detail.connectorId,
      isBot: detail.isBot,
      documentCount: detail.documentCount,
    };
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const peopleService = new PeopleService();
