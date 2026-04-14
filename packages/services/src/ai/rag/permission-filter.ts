import type { Database } from "@openbeam/db";
import { getDocumentPermissions } from "@openbeam/db";
import type { RAGChunk, RAGCitation } from "./types";

export interface PermissionFilterResult {
  accessibleChunks: RAGChunk[];
  filteredCount: number;
  filteredDocIds: string[];
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
      filteredDocIds: [],
      allSourcesAccessible: true,
    };
  }

  const uniqueDocIds = [...new Set(chunks.map((c) => c.documentId))];
  const aclSet = new Set(userAccessControlIds);

  const docPermissions = await Promise.all(
    uniqueDocIds.map((docId) => getDocumentPermissions(db, docId, teamId))
  );

  const accessibleDocIds = new Set<string>();
  const filteredDocIds: string[] = [];

  for (let i = 0; i < uniqueDocIds.length; i += 1) {
    const docId = uniqueDocIds[i] as string;
    const perms = docPermissions[i] ?? [];

    if (perms.length === 0) {
      accessibleDocIds.add(docId);
      continue;
    }

    const hasAccess = perms.some((p) => {
      if (p.granteeType === "ANYONE") {
        return true;
      }
      const aclId = buildPermissionAclId(p);
      return aclId ? aclSet.has(aclId) : false;
    });

    if (hasAccess) {
      accessibleDocIds.add(docId);
    } else {
      filteredDocIds.push(docId);
    }
  }

  const accessibleChunks = chunks.filter((c) =>
    accessibleDocIds.has(c.documentId)
  );

  return {
    accessibleChunks,
    filteredCount: chunks.length - accessibleChunks.length,
    filteredDocIds,
    allSourcesAccessible: filteredDocIds.length === 0,
  };
}

function buildPermissionAclId(perm: {
  granteeType: string;
  granteeId: string | null;
  granteeDomain: string | null;
}): string | null {
  switch (perm.granteeType) {
    case "USER":
      return perm.granteeId ? `user:${perm.granteeId}` : null;
    case "GROUP":
      return perm.granteeId ? `group:${perm.granteeId}` : null;
    case "DOMAIN":
      return perm.granteeDomain ? `domain:${perm.granteeDomain}` : null;
    default:
      return null;
  }
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
