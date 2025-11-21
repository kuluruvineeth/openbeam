/**
 * Vespa YQL query builder utilities
 * Helps construct type-safe queries
 */

export interface QueryBuilderOptions {
  query?: string;
  organizationId: string;
  connectorType?: string;
  documentType?: string;
  sourceId?: string;
  authorId?: string;
  isPublic?: boolean;
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
  accessControl?: string[];
}

/**
 * Build a Vespa YQL query from search parameters
 */
export function buildQuery(options: QueryBuilderOptions): string {
  const conditions: string[] = [];

  // Organization filter (required)
  conditions.push(
    `organization_id contains "${escapeQuery(options.organizationId)}"`
  );

  // Full-text search
  if (options.query) {
    conditions.push(`(default contains "${escapeQuery(options.query)}")`);
  }

  // Connector type filter
  if (options.connectorType) {
    conditions.push(
      `connector_type contains "${escapeQuery(options.connectorType)}"`
    );
  }

  // Document type filter
  if (options.documentType) {
    conditions.push(
      `document_type contains "${escapeQuery(options.documentType)}"`
    );
  }

  // Source filter (channel, folder, etc.)
  if (options.sourceId) {
    conditions.push(`source_id contains "${escapeQuery(options.sourceId)}"`);
  }

  // Author filter
  if (options.authorId) {
    conditions.push(`author_id contains "${escapeQuery(options.authorId)}"`);
  }

  // Access control
  if (options.isPublic !== undefined) {
    conditions.push(`is_public = ${options.isPublic}`);
  }

  // If user-specific access control is needed
  if (options.accessControl && options.accessControl.length > 0) {
    const accessConditions = options.accessControl
      .map((id) => `access_control contains "${escapeQuery(id)}"`)
      .join(" or ");
    conditions.push(`(is_public = true or (${accessConditions}))`);
  } else {
    conditions.push("is_public = true");
  }

  // Date range filters
  if (options.fromDate) {
    conditions.push(`created_at >= ${options.fromDate}`);
  }

  if (options.toDate) {
    conditions.push(`created_at <= ${options.toDate}`);
  }

  // Build YQL query
  const whereClause = conditions.join(" and ");
  let yql = `select * from openplane_document where ${whereClause}`;

  // Add limit and offset
  if (options.limit) {
    yql += ` limit ${options.limit}`;
  }

  if (options.offset) {
    yql += ` offset ${options.offset}`;
  }

  return yql;
}

/**
 * Escape special characters in query string
 */
function escapeQuery(query: string): string {
  return query.replace(/["\\]/g, "\\$&");
}

/**
 * Build a query for searching within a specific thread
 */
export function buildThreadQuery(
  threadId: string,
  organizationId: string
): string {
  return `select * from openplane_document where thread_id contains "${escapeQuery(
    threadId
  )}" and organization_id contains "${escapeQuery(
    organizationId
  )}" order by created_at asc`;
}

/**
 * Build a query for recent documents
 */
export function buildRecentQuery(
  organizationId: string,
  limit = 20,
  hours = 24
): string {
  const fromDate = Date.now() - hours * 60 * 60 * 1000;
  return `select * from openplane_document where organization_id contains "${escapeQuery(
    organizationId
  )}" and created_at >= ${fromDate} order by created_at desc limit ${limit}`;
}

/**
 * Build a query for documents by a specific author
 */
export function buildAuthorQuery(
  authorId: string,
  organizationId: string,
  limit = 50
): string {
  return `select * from openplane_document where author_id contains "${escapeQuery(
    authorId
  )}" and organization_id contains "${escapeQuery(
    organizationId
  )}" order by created_at desc limit ${limit}`;
}

/**
 * Build a query for similar documents using vector search
 */
export function buildSimilarQuery(
  embedding: number[],
  organizationId: string,
  limit = 10
): {
  yql: string;
  ranking: "semantic";
  queryFeatures: Record<string, unknown>;
} {
  if (embedding.length === 0) {
    throw new Error("Embedding is required for similarity search");
  }

  const yql = `select * from openplane_document where {targetHits:${limit}}nearestNeighbor(content_embedding, query_embedding) and organization_id contains "${escapeQuery(
    organizationId
  )}"`;

  return {
    yql,
    ranking: "semantic",
    queryFeatures: {
      query_embedding: {
        type: `tensor<float>(x[${embedding.length}])`,
        values: embedding,
      },
    },
  };
}
