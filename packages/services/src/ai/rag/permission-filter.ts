import type { Database } from "@openbeam/db";
import {
  type DocumentAccessCheck,
  enforcePermissions,
} from "../../permissions/enforcement";
import type { RAGChunk, RAGCitation } from "./types";

export interface PermissionFilterResult {
  accessibleChunks: RAGChunk[];
  filteredCount: number;
  allSourcesAccessible: boolean;
}

export async function filterChunksByPermission(
  db: Database,
  chunks: RAGChunk[],
  userAccessControlIds: string[],
  teamId: string
): Promise<PermissionFilterResult> {
  if (chunks.length === 0) {
    return {
      accessibleChunks: [],
      filteredCount: 0,
      allSourcesAccessible: true,
    };
  }

  const docChecks: DocumentAccessCheck[] = chunks.map((chunk) => ({
    documentId: chunk.documentId,
    accessControl: [],
    isPublic: true,
    connectorId: chunk.connectorType,
  }));

  const result = await enforcePermissions(
    db,
    userAccessControlIds,
    docChecks,
    teamId
  );

  const accessibleSet = new Set(result.accessibleDocIds);
  const accessibleChunks = chunks.filter((c) =>
    accessibleSet.has(c.documentId)
  );
  const filteredCount = chunks.length - accessibleChunks.length;

  return {
    accessibleChunks,
    filteredCount,
    allSourcesAccessible: filteredCount === 0,
  };
}

export function buildSafeAnswerPrefix(
  filteredCount: number,
  totalCount: number
): string | null {
  if (filteredCount === 0) {
    return null;
  }

  if (filteredCount === totalCount) {
    return "I found potentially relevant information, but you don't have access to those sources. Contact your admin for access.";
  }

  return null;
}

export function filterCitationsByPermission(
  citations: RAGCitation[],
  accessibleDocIds: Set<string>
): RAGCitation[] {
  return citations.filter((c) => accessibleDocIds.has(c.documentId));
}
