/**
 * Code Client
 *
 * Client for code schema operations.
 * Handles code search, symbol lookup, and repository browsing.
 */

import type {
  CodeDocument,
  CodeInput,
  CodeSearchOptions,
  CodeUpdate,
  PaginatedResult,
  VespaHit,
} from "../types";
import { BaseVespaClient } from "./base-client";

const SCHEMA = "code";
const NAMESPACE = "default";

export class CodeClient extends BaseVespaClient {
  // === CRUD Operations ===

  /**
   * Index a code file
   */
  async feed(code: CodeInput) {
    const fields = {
      ...code,
      // For n-gram search, copy content to ngram field
      content_ngram: code.content,
      created_at: code.created_at || Date.now(),
      updated_at: code.updated_at || Date.now(),
    };

    return await this.feedToSchema(
      { schema: SCHEMA, namespace: NAMESPACE, docId: code.id },
      fields
    );
  }

  /**
   * Bulk index code files
   */
  async feedBatch(
    files: CodeInput[],
    options: {
      concurrency?: number;
      onProgress?: (indexed: number, total: number) => void;
    } = {}
  ) {
    return await this.feedBatchItems(files, (f) => this.feed(f), options);
  }

  /**
   * Get a code file by ID
   */
  async get(id: string): Promise<CodeDocument | null> {
    return await this.getFromSchema<CodeDocument>(SCHEMA, NAMESPACE, id);
  }

  /**
   * Update a code file
   */
  async update(id: string, fields: CodeUpdate) {
    return await this.updateInSchema(SCHEMA, NAMESPACE, id, {
      ...fields,
      updated_at: fields.updated_at || Date.now(),
    });
  }

  /**
   * Delete a code file
   */
  async delete(id: string): Promise<void> {
    return await this.deleteFromSchema(SCHEMA, NAMESPACE, id);
  }

  // === Search Operations ===

  /**
   * Search code with full options
   */
  async search(
    options: CodeSearchOptions
  ): Promise<PaginatedResult<VespaHit<CodeDocument>>> {
    const conditions = this.buildSearchConditions(options);
    const yql = `select * from ${SCHEMA} where ${conditions.join(" and ")}`;

    const queryFeatures: Record<string, unknown> = {};
    if (options.embedding && options.embedding.length > 0) {
      queryFeatures["input.query(query_embedding)"] = {
        type: `tensor<float>(x[${options.embedding.length}])`,
        values: options.embedding,
      };
    }

    const result = await this.query<CodeDocument>(yql, {
      ranking: options.rankProfile || "default",
      hits: options.limit || 20,
      offset: options.offset || 0,
      queryFeatures:
        Object.keys(queryFeatures).length > 0 ? queryFeatures : undefined,
    });

    return this.buildPaginatedResult(result, options);
  }

  /**
   * Text search in code
   */
  async textSearch(
    query: string,
    teamId: string,
    options: { language?: string; repoId?: string; limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const result = await this.search({
      query,
      teamId,
      language: options.language,
      repoId: options.repoId,
      limit: options.limit,
      rankProfile: "default",
    });
    return result.items;
  }

  /**
   * N-gram search for partial matching (e.g., "connectDB", function names)
   */
  async ngramSearch(
    pattern: string,
    teamId: string,
    options: { language?: string; limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const result = await this.search({
      query: pattern,
      teamId,
      language: options.language,
      limit: options.limit,
      rankProfile: "ngram",
    });
    return result.items;
  }

  /**
   * Search by symbol (function, class, variable names)
   */
  async searchBySymbol(
    symbol: string,
    teamId: string,
    options: { language?: string; limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const yql = `select * from ${SCHEMA} where symbols contains "${this.escape(symbol)}" and team_id contains "${this.escape(teamId)}"${options.language ? ` and language contains "${this.escape(options.language)}"` : ""} limit ${options.limit || 20}`;

    const result = await this.query<CodeDocument>(yql, { ranking: "symbols" });
    return result.root.children || [];
  }

  /**
   * Search by multiple symbols
   */
  async searchBySymbols(
    symbols: string[],
    teamId: string,
    options: { matchAll?: boolean; limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const { matchAll = false, limit = 20 } = options;

    const symbolConditions = symbols.map(
      (s) => `symbols contains "${this.escape(s)}"`
    );
    const operator = matchAll ? " and " : " or ";

    const yql = `select * from ${SCHEMA} where (${symbolConditions.join(operator)}) and team_id contains "${this.escape(teamId)}" limit ${limit}`;

    const result = await this.query<CodeDocument>(yql, { ranking: "symbols" });
    return result.root.children || [];
  }

  /**
   * Find usages of a symbol (files that import/reference it)
   */
  async findUsages(
    symbol: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const yql = `select * from ${SCHEMA} where (imports contains "${this.escape(symbol)}" or references contains "${this.escape(symbol)}") and team_id contains "${this.escape(teamId)}" limit ${options.limit || 50}`;

    const result = await this.query<CodeDocument>(yql);
    return result.root.children || [];
  }

  /**
   * Find definition of a symbol
   */
  async findDefinition(
    symbol: string,
    teamId: string
  ): Promise<VespaHit<CodeDocument> | null> {
    const yql = `select * from ${SCHEMA} where (definitions contains "${this.escape(symbol)}" or exports contains "${this.escape(symbol)}") and team_id contains "${this.escape(teamId)}" limit 10`;

    const result = await this.query<CodeDocument>(yql, { ranking: "symbols" });
    return result.root.children?.[0] || null;
  }

  /**
   * Search in documentation/comments
   */
  async searchDocumentation(
    query: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const result = await this.search({
      query,
      teamId,
      limit: options.limit,
      rankProfile: "documentation",
    });
    return result.items;
  }

  /**
   * Semantic code search
   */
  async semanticSearch(
    embedding: number[],
    teamId: string,
    options: { language?: string; limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const { limit = 20, language } = options;

    let yql = `select * from ${SCHEMA} where {targetHits:${limit}}nearestNeighbor(content_embedding, query_embedding) and team_id contains "${this.escape(teamId)}"`;

    if (language) {
      yql += ` and language contains "${this.escape(language)}"`;
    }

    const result = await this.query<CodeDocument>(yql, {
      ranking: "semantic",
      hits: limit,
      queryFeatures: {
        "input.query(query_embedding)": {
          type: `tensor<float>(x[${embedding.length}])`,
          values: embedding,
        },
      },
    });

    return result.root.children || [];
  }

  /**
   * Get files in a repository
   */
  async getByRepository(
    repoId: string,
    teamId: string,
    options: {
      directory?: string;
      language?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<PaginatedResult<VespaHit<CodeDocument>>> {
    return await this.search({
      teamId,
      repoId,
      language: options.language,
      filePath: options.directory,
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Get recently modified files
   */
  async getRecentlyModified(
    teamId: string,
    options: { hours?: number; repoId?: string; limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const { hours = 24, repoId, limit = 20 } = options;
    const fromTime = Date.now() - hours * 60 * 60 * 1000;

    let yql = `select * from ${SCHEMA} where team_id contains "${this.escape(teamId)}" and updated_at >= ${fromTime}`;

    if (repoId) {
      yql += ` and repo_id contains "${this.escape(repoId)}"`;
    }

    yql += ` order by updated_at desc limit ${limit}`;

    const result = await this.query<CodeDocument>(yql, { ranking: "recent" });
    return result.root.children || [];
  }

  /**
   * Get similar code files
   */
  async getSimilar(
    fileId: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    const file = await this.get(fileId);
    if (!file?.content_embedding) {
      return [];
    }

    const results = await this.semanticSearch(file.content_embedding, teamId, {
      limit: (options.limit || 10) + 1,
    });

    return results
      .filter((f) => f.fields.id !== fileId)
      .slice(0, options.limit || 10);
  }

  /**
   * Get files by language statistics
   */
  async getLanguageStats(_teamId: string): Promise<Record<string, number>> {
    //TODO: This would ideally use Vespa grouping, but for simplicity we'll return empty
    // In production, you'd use: `select * from code where team_id... | all(group(language) each(count()))`
    await Promise.resolve();
    console.warn(
      "Language stats requires Vespa grouping - implement with visitor/grouping API"
    );
    return {};
  }

  // === Quality Code Helpers ===

  /**
   * Find well-documented code (for learning/reference)
   */
  async findWellDocumented(
    teamId: string,
    options: { language?: string; limit?: number } = {}
  ): Promise<VespaHit<CodeDocument>[]> {
    let yql = `select * from ${SCHEMA} where team_id contains "${this.escape(teamId)}" and has_tests = true`;

    if (options.language) {
      yql += ` and language contains "${this.escape(options.language)}"`;
    }

    yql += ` limit ${options.limit || 20}`;

    const result = await this.query<CodeDocument>(yql, { ranking: "quality" });
    return result.root.children || [];
  }

  // === Helper Methods ===

  private buildSearchConditions(options: CodeSearchOptions): string[] {
    const conditions: string[] = [];

    // Required: team filter
    conditions.push(`team_id contains "${this.escape(options.teamId)}"`);

    // Text search
    if (options.query) {
      conditions.push(`(default contains "${this.escape(options.query)}")`);
    }

    // Filters
    if (options.repoId) {
      conditions.push(`repo_id contains "${this.escape(options.repoId)}"`);
    }
    if (options.repoName) {
      conditions.push(`repo_name contains "${this.escape(options.repoName)}"`);
    }
    if (options.language) {
      conditions.push(`language contains "${this.escape(options.language)}"`);
    }
    if (options.filePath) {
      conditions.push(`file_path contains "${this.escape(options.filePath)}"`);
    }

    // Symbol filters
    if (options.symbols && options.symbols.length > 0) {
      const symbolConditions = options.symbols
        .map((s) => `symbols contains "${this.escape(s)}"`)
        .join(" or ");
      conditions.push(`(${symbolConditions})`);
    }

    return conditions;
  }
}

export const codeClient = new CodeClient();
