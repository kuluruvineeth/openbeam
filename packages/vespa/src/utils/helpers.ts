/**
 * Vespa Helper Utilities
 *
 * Common utility functions for Vespa operations.
 */

import type { Embedding, OpenPlaneDocument, VespaHit } from "../types";
import { EMBEDDING_DIMENSIONS } from "./constants";

// Top-level regex for performance
const WHITESPACE_REGEX = /\s+/;

// === Document Helpers ===

/**
 * Generate a unique document ID
 */
export function generateDocumentId(
  connectorId: string,
  externalId: string
): string {
  return `${connectorId}:${externalId}`;
}

/**
 * Parse a document ID back to connector and external IDs
 */
export function parseDocumentId(id: string): {
  connectorId: string;
  externalId: string;
} {
  const [connectorId = "", ...rest] = id.split(":");
  return {
    connectorId,
    externalId: rest.join(":"),
  };
}

/**
 * Generate a unique entity ID
 */
export function generateEntityId(
  connectorId: string,
  entityType: string,
  externalId: string
): string {
  return `${connectorId}:${entityType}:${externalId}`;
}

/**
 * Generate a unique person ID
 */
export function generatePersonId(connectorId: string, email: string): string {
  return `${connectorId}:person:${email}`;
}

/**
 * Generate a unique code ID
 */
export function generateCodeId(
  connectorId: string,
  repoId: string,
  filePath: string
): string {
  return `${connectorId}:${repoId}:${filePath}`;
}

// === Embedding Helpers ===

/**
 * Validate embedding dimensions
 */
export function validateEmbedding(
  embedding: Embedding,
  expectedDimensions: number = EMBEDDING_DIMENSIONS.DEFAULT
): boolean {
  return Array.isArray(embedding) && embedding.length === expectedDimensions;
}

/**
 * Normalize embedding for cosine similarity
 */
export function normalizeEmbedding(embedding: Embedding): Embedding {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );
  if (magnitude === 0) {
    return embedding;
  }
  return embedding.map((val) => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

// === Access Control Helpers ===

/**
 * Build access control list from user ID and group IDs
 */
export function buildAccessControlList(
  userId: string,
  groupIds: string[] = [],
  teamId?: string
): string[] {
  const acl: string[] = [`user:${userId}`];

  for (const groupId of groupIds) {
    acl.push(`group:${groupId}`);
  }

  if (teamId) {
    acl.push(`team:${teamId}`);
  }

  return acl;
}

/**
 * Check if user has access based on ACL
 */
export function hasAccess(
  document:
    | OpenPlaneDocument
    | { is_public?: boolean; access_control?: string[] },
  userAccessList: string[]
): boolean {
  // Public documents are always accessible
  if (document.is_public) {
    return true;
  }

  // Check if any of user's access IDs match document's ACL
  if (!document.access_control || document.access_control.length === 0) {
    return false;
  }

  return userAccessList.some((id) => document.access_control?.includes(id));
}

// === Text Processing ===

/**
 * Extract plain text from HTML
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Extract preview/snippet from content
 */
export function extractPreview(
  content: string,
  query?: string,
  maxLength = 200
): string {
  const plain = stripHtml(content);

  // If query provided, try to find relevant section
  if (query) {
    const lowerContent = plain.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryIndex = lowerContent.indexOf(lowerQuery);

    if (queryIndex !== -1) {
      // Extract context around the query
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(plain.length, queryIndex + query.length + 150);
      return truncateText(plain.slice(start, end), maxLength);
    }
  }

  // Otherwise, return beginning of content
  return truncateText(plain, maxLength);
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(WHITESPACE_REGEX)
    .filter((word) => word.length > 0).length;
}

// === Date Helpers ===

/**
 * Convert Date to Unix timestamp in milliseconds
 */
export function dateToTimestamp(date: Date): number {
  return date.getTime();
}

/**
 * Convert Unix timestamp in milliseconds to Date
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Get timestamp for "hours ago"
 */
export function hoursAgo(hours: number): number {
  return Date.now() - hours * 60 * 60 * 1000;
}

/**
 * Get timestamp for "days ago"
 */
export function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// === Scoring Helpers ===

/**
 * Calculate freshness score (0-1) based on age
 */
export function calculateFreshnessScore(
  timestamp: number,
  maxAgeDays = 30
): number {
  const ageMs = Date.now() - timestamp;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  if (ageMs <= 0) {
    return 1;
  }
  if (ageMs >= maxAgeMs) {
    return 0;
  }

  // Exponential decay
  return Math.exp(-ageMs / maxAgeMs);
}

/**
 * Calculate popularity score based on engagement metrics
 */
export function calculatePopularityScore(metrics: {
  viewCount?: number;
  clickCount?: number;
  reactionCount?: number;
  commentCount?: number;
  shareCount?: number;
}): number {
  const weights = {
    view: 0.1,
    click: 0.2,
    reaction: 0.25,
    comment: 0.3,
    share: 0.15,
  };

  const score =
    (metrics.viewCount || 0) * weights.view +
    (metrics.clickCount || 0) * weights.click +
    (metrics.reactionCount || 0) * weights.reaction +
    (metrics.commentCount || 0) * weights.comment +
    (metrics.shareCount || 0) * weights.share;

  // Normalize using log scale
  return Math.log1p(score) / 10;
}

/**
 * Calculate quality score (0-1) based on content signals
 */
export function calculateQualityScore(signals: {
  wordCount?: number;
  hasImages?: boolean;
  hasCode?: boolean;
  hasLinks?: boolean;
  isVerified?: boolean;
  reactionCount?: number;
}): number {
  let score = 0.5; // Base score

  // Content length (prefer medium-length content)
  const wordCount = signals.wordCount || 0;
  if (wordCount >= 100 && wordCount <= 2000) {
    score += 0.1;
  } else if (wordCount >= 50) {
    score += 0.05;
  }

  // Rich content
  if (signals.hasImages) {
    score += 0.1;
  }
  if (signals.hasCode) {
    score += 0.05;
  }
  if (signals.hasLinks) {
    score += 0.05;
  }

  // Verification
  if (signals.isVerified) {
    score += 0.2;
  }

  // Community validation
  if ((signals.reactionCount || 0) > 5) {
    score += 0.1;
  }

  return Math.min(1, score);
}

// === Result Helpers ===

/**
 * Extract documents from Vespa hits
 */
export function extractDocuments<T>(hits: VespaHit<T>[]): T[] {
  return hits.map((hit) => hit.fields);
}

/**
 * Get top results by relevance threshold
 */
export function filterByRelevance<T>(
  hits: VespaHit<T>[],
  minRelevance: number
): VespaHit<T>[] {
  return hits.filter((hit) => hit.relevance >= minRelevance);
}

/**
 * Deduplicate results by field
 */
export function deduplicateBy<T>(
  hits: VespaHit<T>[],
  keyFn: (doc: T) => string
): VespaHit<T>[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = keyFn(hit.fields);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// === Batch Helpers ===

/**
 * Split array into batches
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Process items in parallel with concurrency limit
 */
export async function parallelProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}
