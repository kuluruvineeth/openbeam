/**
 * YQL Query Builder
 *
 * Type-safe, fluent query builder for Vespa YQL queries.
 */

import type { DateRangeFilter, Embedding } from "../types";

// === Helper Functions ===

export function escapeYql(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

export function formatEmbedding(
  embedding: Embedding,
  dimensions = 768
): string {
  return JSON.stringify({
    type: `tensor<float>(x[${dimensions}])`,
    values: embedding,
  });
}

// === Base Query Builder ===

export class YqlBuilder {
  protected schema: string;
  protected conditions: string[] = [];
  protected orderByClause: string | null = null;
  protected limitValue: number | null = null;
  protected offsetValue: number | null = null;
  protected selectFields = "*";
  protected groupByClause: string | null = null;

  constructor(schema: string) {
    this.schema = schema;
  }

  // === Select ===

  select(fields: string[] | "*" = "*"): this {
    if (Array.isArray(fields)) {
      this.selectFields = fields.join(", ");
    } else {
      this.selectFields = fields;
    }
    return this;
  }

  // === Where Conditions ===

  where(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  and(condition: string): this {
    return this.where(condition);
  }

  // === Contains (text search) ===

  contains(field: string, value: string): this {
    this.conditions.push(`${field} contains "${escapeYql(value)}"`);
    return this;
  }

  containsAny(field: string, values: string[]): this {
    if (values.length === 0) {
      return this;
    }
    const conditions = values
      .map((v) => `${field} contains "${escapeYql(v)}"`)
      .join(" or ");
    this.conditions.push(`(${conditions})`);
    return this;
  }

  containsAll(field: string, values: string[]): this {
    if (values.length === 0) {
      return this;
    }
    for (const value of values) {
      this.contains(field, value);
    }
    return this;
  }

  // === Comparison ===

  equals(field: string, value: string | number | boolean): this {
    if (typeof value === "string") {
      this.conditions.push(`${field} contains "${escapeYql(value)}"`);
    } else {
      this.conditions.push(`${field} = ${value}`);
    }
    return this;
  }

  notEquals(field: string, value: string | number | boolean): this {
    if (typeof value === "string") {
      this.conditions.push(`!(${field} contains "${escapeYql(value)}")`);
    } else {
      this.conditions.push(`${field} != ${value}`);
    }
    return this;
  }

  greaterThan(field: string, value: number): this {
    this.conditions.push(`${field} > ${value}`);
    return this;
  }

  greaterThanOrEqual(field: string, value: number): this {
    this.conditions.push(`${field} >= ${value}`);
    return this;
  }

  lessThan(field: string, value: number): this {
    this.conditions.push(`${field} < ${value}`);
    return this;
  }

  lessThanOrEqual(field: string, value: number): this {
    this.conditions.push(`${field} <= ${value}`);
    return this;
  }

  between(field: string, min: number, max: number): this {
    this.conditions.push(`${field} >= ${min}`);
    this.conditions.push(`${field} <= ${max}`);
    return this;
  }

  // === Date Range ===

  dateRange(field: string, range: DateRangeFilter): this {
    if (range.from) {
      this.greaterThanOrEqual(field, range.from);
    }
    if (range.to) {
      this.lessThanOrEqual(field, range.to);
    }
    return this;
  }

  withinHours(field: string, hours: number): this {
    const fromTime = Date.now() - hours * 60 * 60 * 1000;
    return this.greaterThanOrEqual(field, fromTime);
  }

  withinDays(field: string, days: number): this {
    return this.withinHours(field, days * 24);
  }

  // === Boolean ===

  isTrue(field: string): this {
    this.conditions.push(`${field} = true`);
    return this;
  }

  isFalse(field: string): this {
    this.conditions.push(`${field} = false`);
    return this;
  }

  isNull(field: string): this {
    this.conditions.push(`!${field}`);
    return this;
  }

  isNotNull(field: string): this {
    this.conditions.push(`${field}`);
    return this;
  }

  // === Vector Search ===

  nearestNeighbor(
    embeddingField: string,
    queryName: string,
    targetHits: number
  ): this {
    this.conditions.push(
      `{targetHits:${targetHits}}nearestNeighbor(${embeddingField}, ${queryName})`
    );
    return this;
  }

  // === Full-Text Search ===

  fullText(query: string, fieldSet = "default"): this {
    this.conditions.push(`(${fieldSet} contains "${escapeYql(query)}")`);
    return this;
  }

  // === Access Control ===

  withAccessControl(userAccessIds: string[]): this {
    if (userAccessIds.length === 0) {
      this.isTrue("is_public");
    } else {
      const accessConditions = userAccessIds
        .map((id) => `access_control contains "${escapeYql(id)}"`)
        .join(" or ");
      this.conditions.push(`(is_public = true or (${accessConditions}))`);
    }
    return this;
  }

  publicOnly(): this {
    return this.isTrue("is_public");
  }

  // === Exclusions ===

  excludeArchived(): this {
    this.conditions.push("(is_archived = false or !is_archived)");
    return this;
  }

  excludeDeleted(): this {
    this.conditions.push("(is_deleted = false or !is_deleted)");
    return this;
  }

  excludeBots(): this {
    this.conditions.push("(is_bot = false or !is_bot)");
    return this;
  }

  activeOnly(): this {
    return this.isTrue("is_active");
  }

  // === Ordering ===

  orderBy(field: string, order: "asc" | "desc" = "desc"): this {
    this.orderByClause = `order by ${field} ${order}`;
    return this;
  }

  orderByRelevance(): this {
    this.orderByClause = null; // Default Vespa behavior
    return this;
  }

  // === Pagination ===

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  paginate(page: number, pageSize: number): this {
    this.limitValue = pageSize;
    this.offsetValue = (page - 1) * pageSize;
    return this;
  }

  // === Grouping (Advanced) ===

  groupBy(expression: string): this {
    this.groupByClause = expression;
    return this;
  }

  // === Build ===

  build(): string {
    let yqlString = `select ${this.selectFields} from ${this.schema}`;

    if (this.conditions.length > 0) {
      yqlString += ` where ${this.conditions.join(" and ")}`;
    }

    if (this.groupByClause) {
      yqlString += ` | ${this.groupByClause}`;
    }

    if (this.orderByClause) {
      yqlString += ` ${this.orderByClause}`;
    }

    if (this.limitValue !== null) {
      yqlString += ` limit ${this.limitValue}`;
    }

    if (this.offsetValue !== null) {
      yqlString += ` offset ${this.offsetValue}`;
    }

    return yqlString;
  }

  toString(): string {
    return this.build();
  }
}

// === Schema-Specific Builders ===

export class DocumentQueryBuilder extends YqlBuilder {
  constructor() {
    super("openplane_document");
  }

  forTeam(teamId: string): this {
    return this.contains("team_id", teamId);
  }

  forConnector(connectorId: string): this {
    return this.contains("connector_id", connectorId);
  }

  ofConnectorType(connectorType: string): this {
    return this.contains("connector_type", connectorType);
  }

  ofDocumentType(documentType: string): this {
    return this.contains("document_type", documentType);
  }

  inSource(sourceId: string): this {
    return this.contains("source_id", sourceId);
  }

  byAuthor(authorId: string): this {
    return this.contains("author_id", authorId);
  }

  inThread(threadId: string): this {
    return this.contains("thread_id", threadId);
  }

  inProject(projectId: string): this {
    return this.contains("project_id", projectId);
  }

  withStatus(status: string): this {
    return this.contains("status", status);
  }

  withPriority(priority: string): this {
    return this.contains("priority", priority);
  }

  withLabels(labels: string[]): this {
    return this.containsAny("labels", labels);
  }

  searchText(query: string): this {
    return this.fullText(query, "default");
  }

  searchFullText(query: string): this {
    return this.fullText(query, "full_text");
  }

  semanticSearch(targetHits = 20): this {
    return this.nearestNeighbor(
      "content_embedding",
      "query_embedding",
      targetHits
    );
  }

  recentFirst(): this {
    return this.orderBy("created_at", "desc");
  }

  popularFirst(): this {
    return this.orderBy("popularity_score", "desc");
  }
}

export class PersonQueryBuilder extends YqlBuilder {
  constructor() {
    super("person");
  }

  forTeam(teamId: string): this {
    return this.contains("team_id", teamId);
  }

  forConnector(connectorId: string): this {
    return this.contains("connector_id", connectorId);
  }

  withEmail(email: string): this {
    return this.contains("email", email);
  }

  inDepartment(department: string): this {
    return this.contains("department", department);
  }

  inLocation(location: string): this {
    return this.contains("location", location);
  }

  withSkills(skills: string[]): this {
    return this.containsAny("skills", skills);
  }

  withAllSkills(skills: string[]): this {
    return this.containsAll("skills", skills);
  }

  withExpertise(areas: string[]): this {
    return this.containsAny("expertise_areas", areas);
  }

  managedBy(managerId: string): this {
    return this.contains("manager_id", managerId);
  }

  searchName(name: string): this {
    return this.fullText(name, "default");
  }

  semanticSearch(targetHits = 20): this {
    return this.nearestNeighbor(
      "profile_embedding",
      "query_embedding",
      targetHits
    );
  }

  mostActive(): this {
    return this.orderBy("contribution_score", "desc");
  }

  recentlyActive(): this {
    return this.orderBy("last_active_at", "desc");
  }
}

export class CodeQueryBuilder extends YqlBuilder {
  constructor() {
    super("code");
  }

  forTeam(teamId: string): this {
    return this.contains("team_id", teamId);
  }

  forConnector(connectorId: string): this {
    return this.contains("connector_id", connectorId);
  }

  inRepo(repoId: string): this {
    return this.contains("repo_id", repoId);
  }

  inRepoNamed(repoName: string): this {
    return this.contains("repo_name", repoName);
  }

  withLanguage(language: string): this {
    return this.contains("language", language);
  }

  inDirectory(directory: string): this {
    return this.contains("directory", directory);
  }

  withSymbol(symbol: string): this {
    return this.contains("symbols", symbol);
  }

  withSymbols(symbols: string[]): this {
    return this.containsAny("symbols", symbols);
  }

  importing(module: string): this {
    return this.contains("imports", module);
  }

  exporting(symbol: string): this {
    return this.contains("exports", symbol);
  }

  defining(symbol: string): this {
    return this.contains("definitions", symbol);
  }

  searchCode(query: string): this {
    return this.fullText(query, "default");
  }

  searchDocs(query: string): this {
    return this.fullText(query, "documentation");
  }

  semanticSearch(targetHits = 20): this {
    return this.nearestNeighbor(
      "content_embedding",
      "query_embedding",
      targetHits
    );
  }

  recentlyModified(): this {
    return this.orderBy("updated_at", "desc");
  }

  withTests(): this {
    return this.isTrue("has_tests");
  }
}

export class EntityQueryBuilder extends YqlBuilder {
  constructor() {
    super("entity");
  }

  forTeam(teamId: string): this {
    return this.contains("team_id", teamId);
  }

  forConnector(connectorId: string): this {
    return this.contains("connector_id", connectorId);
  }

  ofType(entityType: string): this {
    return this.contains("entity_type", entityType);
  }

  ofTypes(entityTypes: string[]): this {
    return this.containsAny("entity_type", entityTypes);
  }

  withParent(parentId: string): this {
    return this.contains("parent_id", parentId);
  }

  withTag(tag: string): this {
    return this.contains("tags", tag);
  }

  withTags(tags: string[]): this {
    return this.containsAny("tags", tags);
  }

  withTopic(topic: string): this {
    return this.contains("topics", topic);
  }

  searchName(name: string): this {
    return this.fullText(name, "default");
  }

  semanticSearch(targetHits = 20): this {
    return this.nearestNeighbor(
      "entity_embedding",
      "query_embedding",
      targetHits
    );
  }

  mostActive(): this {
    return this.orderBy("activity_score", "desc");
  }

  mostPopular(): this {
    return this.orderBy("member_count", "desc");
  }
}

// === Factory Functions ===

export function documentQuery(): DocumentQueryBuilder {
  return new DocumentQueryBuilder();
}

export function personQuery(): PersonQueryBuilder {
  return new PersonQueryBuilder();
}

export function codeQuery(): CodeQueryBuilder {
  return new CodeQueryBuilder();
}

export function entityQuery(): EntityQueryBuilder {
  return new EntityQueryBuilder();
}

export function yql(schema: string): YqlBuilder {
  return new YqlBuilder(schema);
}
