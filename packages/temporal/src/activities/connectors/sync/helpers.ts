import type { GenericDocument } from "@openbeam/vespa";
import type { SyncCursor } from "../../../workflows/types";

export function parseNumericConfig(
  value: unknown,
  fallback?: number
): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export function parseBooleanConfig(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  return;
}

export function createDeleteMarker(params: {
  documentId: string;
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  externalId: string;
  documentType: string;
}): GenericDocument {
  return {
    id: params.documentId,
    connector_id: params.connectorId,
    connector_type: params.connectorType,
    team_id: params.teamId,
    workspace_id: params.workspaceId,
    external_id: params.externalId,
    document_type: params.documentType,
    title: "",
    content: "",
    created_at: 0,
    updated_at: Date.now(),
    is_public: false,
    metadata: {
      deleted: true,
      deletedAt: Date.now(),
    },
  };
}

export function shouldRunFullSync(
  syncType: string | undefined,
  cursor: SyncCursor | undefined
): boolean {
  if (syncType === "FULL") {
    return true;
  }
  if (syncType === "INCREMENTAL") {
    return false;
  }
  const forceFullSync = parseBooleanConfig(cursor?.forceFullSync) === true;
  if (forceFullSync) {
    return true;
  }
  const lastSyncTime = parseNumericConfig(cursor?.lastSyncTime);
  return typeof lastSyncTime !== "number";
}
