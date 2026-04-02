import { num, plural, relativeTime } from "./helpers";

type SyncProgressEntry = {
  workflowId: string;
  stage: string;
  processed: number;
  indexed: number;
  errors: number;
  dataAdded: number;
  dataUpdated: number;
  dataDeleted: number;
  batchNumber?: number;
  progressMessage?: string;
  isPaused?: boolean;
};

type SyncProgressResult = {
  connectorId: string;
  activeSyncs: SyncProgressEntry[];
};

export function formatSyncProgress(r: SyncProgressResult): string {
  if (r.activeSyncs.length === 0) {
    return [
      `No active syncs for connector ${r.connectorId}.`,
      "",
      "Next steps:",
      "• Check the last completed sync: sync_status with this connector ID.",
      "• Start a new sync: sync_trigger with this connector ID.",
    ].join("\n");
  }

  const parts: string[] = [
    `${plural(r.activeSyncs.length, "active sync")} for connector ${r.connectorId}:`,
    "",
  ];

  for (const s of r.activeSyncs) {
    const paused = s.isPaused ? " (PAUSED)" : "";
    parts.push(`Workflow: ${s.workflowId}`);
    parts.push(`Stage: ${s.stage}${paused}`);
    parts.push(
      `Processed: ${num(s.processed)} docs (${num(s.indexed)} indexed, ${num(s.errors)} errors)`
    );
    parts.push(
      `Changes: +${num(s.dataAdded)} added, ~${num(s.dataUpdated)} updated, -${num(s.dataDeleted)} deleted`
    );
    if (s.batchNumber != null) {
      parts.push(`Batch: ${s.batchNumber}`);
    }
    if (s.progressMessage) {
      parts.push(`Message: ${s.progressMessage}`);
    }
    parts.push("");
  }

  parts.push("Next steps:");
  parts.push("• Pause a running sync: sync_pause with this connector ID.");
  parts.push("• Cancel a running sync: sync_cancel with this connector ID.");
  parts.push("• View past syncs: sync_history with this connector ID.");

  return parts.join("\n");
}

type SyncErrorEntry = {
  connectorId: string;
  connectorType?: string | null;
  status: string;
  type?: string | null;
  startedAt?: string | null;
  errorMessage?: string | null;
  documentsProcessed?: number | null;
};

type SyncErrorsResult = {
  errors: SyncErrorEntry[];
  total: number;
};

export function formatSyncErrors(r: SyncErrorsResult): string {
  if (r.errors.length === 0) {
    return [
      "No sync errors found.",
      "",
      "Next steps:",
      "• Check connector health: sync_health for an overview of all connectors.",
      "• Trigger a sync: sync_trigger with a connector ID.",
    ].join("\n");
  }

  const parts: string[] = [
    `${plural(r.total, "sync error")} found (showing ${r.errors.length}):`,
    "",
  ];

  for (const e of r.errors) {
    const type = e.type ?? "full";
    const time = relativeTime(e.startedAt);
    const docs =
      e.documentsProcessed != null
        ? `, ${num(e.documentsProcessed)} docs processed`
        : "";
    parts.push(
      `• ${e.connectorId} (${e.connectorType ?? "unknown"}): ${type} sync ${e.status.toLowerCase()} (${time})${docs}`
    );
    if (e.errorMessage) {
      parts.push(`  Error: ${e.errorMessage}`);
    }
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push(
    "• Check a specific connector: connector_health with the connector ID."
  );
  parts.push("• View full history: sync_history with a connector ID.");
  parts.push("• Re-trigger after fixing: sync_trigger with the connector ID.");

  return parts.join("\n");
}

type SyncHealthEntry = {
  connectorId: string;
  connectorName: string;
  connectorType: string;
  status: string;
  documentCount: number;
  lastSyncStatus?: string | null;
  lastSyncAt?: string | null;
};

type SyncHealthResult = {
  healthy: number;
  warning: number;
  error: number;
  total: number;
  connectors: SyncHealthEntry[];
};

export function formatSyncHealth(r: SyncHealthResult): string {
  if (r.total === 0) {
    return [
      "No connectors configured.",
      "",
      "Next steps:",
      "• Set up a connector: connector_setup.",
      "• View available connectors: connector_available.",
    ].join("\n");
  }

  const parts: string[] = [
    `Sync health: ${r.healthy} healthy, ${r.warning} warning, ${r.error} error (${r.total} total connectors).`,
    "",
  ];

  for (const c of r.connectors) {
    function healthIcon(): string {
      if (c.status === "ACTIVE" && c.lastSyncStatus === "COMPLETED") {
        return "OK";
      }
      if (c.status === "ERROR" || c.lastSyncStatus === "FAILED") {
        return "ERR";
      }
      return "WARN";
    }
    const icon = healthIcon();
    const lastSync = c.lastSyncAt
      ? `last sync ${relativeTime(c.lastSyncAt)}`
      : "never synced";
    parts.push(
      `[${icon}] ${c.connectorName} (${c.connectorType}): ${num(c.documentCount)} docs, ${lastSync}`
    );
  }

  parts.push("");
  parts.push("Next steps:");
  if (r.error > 0) {
    parts.push(
      "• Investigate errors: sync_errors or connector_health with a connector ID."
    );
  }
  if (r.warning > 0) {
    parts.push(
      "• Check warnings: sync_status with the connector ID for details."
    );
  }
  parts.push("• Trigger a sync: sync_trigger with a connector ID.");

  return parts.join("\n");
}
