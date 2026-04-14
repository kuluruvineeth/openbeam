import type { Database } from "@openbeam/db";
import { getPermissionSyncStatus } from "@openbeam/db";

export type DenialReason =
  | "no_acl"
  | "acl_mismatch"
  | "expired"
  | "connector_disabled"
  | "stale"
  | "unknown";

export interface DocumentAccessCheck {
  documentId: string;
  accessControl: string[];
  isPublic: boolean;
  connectorId: string;
  permissionExpiresAt?: Date | null;
}

export interface PermissionEnforcementResult {
  accessibleDocIds: string[];
  deniedDocIds: string[];
  denialReasons: Map<string, DenialReason>;
}

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export async function enforcePermissions(
  db: Database,
  userAccessControlIds: string[],
  documents: DocumentAccessCheck[]
): Promise<PermissionEnforcementResult> {
  const accessibleDocIds: string[] = [];
  const deniedDocIds: string[] = [];
  const denialReasons = new Map<string, DenialReason>();

  const connectorIds = [...new Set(documents.map((d) => d.connectorId))];
  const syncStatuses = await Promise.all(
    connectorIds.map((id) => getPermissionSyncStatus(db, id))
  );
  const syncStatusMap = new Map(
    connectorIds.map((id, i) => [id, syncStatuses[i] ?? null])
  );

  const aclSet = new Set(userAccessControlIds);

  for (const doc of documents) {
    const reason = checkDocumentAccess(doc, aclSet, syncStatusMap);
    if (reason) {
      deniedDocIds.push(doc.documentId);
      denialReasons.set(doc.documentId, reason);
    } else {
      accessibleDocIds.push(doc.documentId);
    }
  }

  return { accessibleDocIds, deniedDocIds, denialReasons };
}

function checkDocumentAccess(
  doc: DocumentAccessCheck,
  userAcls: Set<string>,
  syncStatuses: Map<string, Awaited<ReturnType<typeof getPermissionSyncStatus>>>
): DenialReason | null {
  if (doc.isPublic) {
    return null;
  }

  if (doc.permissionExpiresAt && doc.permissionExpiresAt < new Date()) {
    return "expired";
  }

  if (doc.accessControl.length === 0) {
    const syncStatus = syncStatuses.get(doc.connectorId);
    if (!syncStatus || syncStatus.status === "DISABLED") {
      return "connector_disabled";
    }
    return "no_acl";
  }

  const syncStatus = syncStatuses.get(doc.connectorId);
  if (syncStatus?.status === "FAILED" && syncStatus.lastFullSync) {
    const staleDuration = Date.now() - syncStatus.lastFullSync.getTime();
    if (staleDuration > STALE_THRESHOLD_MS) {
      return "stale";
    }
  }

  for (const acl of doc.accessControl) {
    if (userAcls.has(acl)) {
      return null;
    }
  }

  return "acl_mismatch";
}
