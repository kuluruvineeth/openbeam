/**
 * Checksum Utilities
 * 
 * Calculate content hashes for document deduplication.
 * Uses SHA-256 for reliable change detection.
 */

import { createHash } from "node:crypto";

/**
 * Calculate SHA-256 checksum for document content
 * @param content - Document content to hash (title + body)
 * @returns Hex-encoded SHA-256 hash
 */
export function calculateChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Calculate checksum for a document object
 * Combines title and content fields
 */
export function calculateDocumentChecksum(doc: {
  title?: string;
  content?: string;
  body?: string;
  text?: string;
}): string {
  const parts = [
    doc.title || "",
    doc.content || doc.body || doc.text || "",
  ].filter(Boolean);

  return calculateChecksum(parts.join("\n"));
}

/**
 * Check if two checksums match (documents unchanged)
 */
export function checksumsMatch(
  checksum1: string | null | undefined,
  checksum2: string | null | undefined
): boolean {
  if (!checksum1 || !checksum2) return false;
  return checksum1 === checksum2;
}

