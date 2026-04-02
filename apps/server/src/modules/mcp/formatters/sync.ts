import { num, plural, relativeTime } from "./helpers";

type SyncTriggerResult = {
  syncJobId: string;
  workflowId: string;
  connectorId: string;
  type: string;
};

type SyncStatusResult = {
  connector: unknown;
  latestSync?: {
    status: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    dataAdded?: number | null;
    dataUpdated?: number | null;
    dataDeleted?: number | null;
    errorMessage?: string | null;
  } | null;
  stats: unknown;
  processing: unknown;
};

type SyncHistoryEntry = {
  id: string;
  status: string;
  type?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  documentsProcessed?: number | null;
  errorMessage?: string | null;
};

export function formatSyncTrigger(r: SyncTriggerResult): string {
  return [
    `Sync started for connector ${r.connectorId}.`,
    `Type: ${r.type}`,
    `Job ID: ${r.syncJobId}`,
    "",
    "Next steps:",
    `• Check progress: sync_status with connector ID "${r.connectorId}".`,
    `• View past syncs: sync_history with connector ID "${r.connectorId}".`,
    `• Check health after sync: connector_health with connector ID "${r.connectorId}".`,
  ].join("\n");
}

export function formatSyncStatus(r: SyncStatusResult): string {
  const parts: string[] = [];

  if (r.latestSync) {
    const ls = r.latestSync;
    parts.push(`Latest sync: ${ls.status.toLowerCase()}`);
    if (ls.startedAt) {
      parts.push(`Started: ${relativeTime(ls.startedAt)}`);
    }
    if (ls.finishedAt) {
      parts.push(`Finished: ${relativeTime(ls.finishedAt)}`);
    }

    const added = ls.dataAdded ?? 0;
    const updated = ls.dataUpdated ?? 0;
    const deleted = ls.dataDeleted ?? 0;
    if (added + updated + deleted > 0) {
      parts.push(
        `Changes: +${num(added)} added, ~${num(updated)} updated, -${num(deleted)} deleted`
      );
    }
    if (ls.errorMessage) {
      parts.push(`Error: ${ls.errorMessage}`);
    }
  } else {
    parts.push("No sync history available.");
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push("• Trigger a new sync: sync_trigger with this connector ID.");
  parts.push("• View past syncs: sync_history with this connector ID.");
  parts.push(
    "• Check connector health: connector_health with this connector ID."
  );
  parts.push("• Search synced documents: search_documents with a query.");

  return parts.join("\n");
}

export function formatSyncHistory(
  entries: SyncHistoryEntry[],
  total: number
): string {
  if (entries.length === 0) {
    return "No sync history found for this connector.";
  }

  const rows = entries.map((e) => {
    const status = e.status.toLowerCase();
    const type = e.type ?? "full";
    const time = relativeTime(e.startedAt);
    const docs =
      e.documentsProcessed != null ? `${num(e.documentsProcessed)} docs` : "";
    const err = e.errorMessage ? ` — error: ${e.errorMessage}` : "";
    return `• ${type} sync ${status} (${time}) ${docs}${err}`;
  });

  const hints = [
    "",
    "Next steps:",
    "• Trigger a new sync: sync_trigger with this connector ID.",
    "• Check current sync status: sync_status with this connector ID.",
    "• Check connector health: connector_health with this connector ID.",
  ].join("\n");

  return `Sync history (${total} total runs):\n\n${rows.join("\n")}${hints}`;
}

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

type SyncTriggerAllEntry = {
  connectorId: string;
  connectorName: string;
  connectorType: string;
  status: "triggered" | "already_running" | "failed";
  syncJobId?: string;
  workflowId?: string;
  error?: string;
};

type SyncTriggerAllResult = {
  type: string;
  triggered: number;
  alreadyRunning: number;
  failed: number;
  total: number;
  connectors: SyncTriggerAllEntry[];
};

export function formatSyncTriggerAll(r: SyncTriggerAllResult): string {
  const parts: string[] = [
    `Bulk ${r.type.toLowerCase()} sync: ${r.triggered} triggered, ${r.alreadyRunning} already running, ${r.failed} failed (${r.total} total connectors).`,
    "",
  ];

  for (const c of r.connectors) {
    const STATUS_ICONS: Record<string, string> = {
      triggered: "+",
      already_running: "~",
      failed: "!",
    };
    const icon = STATUS_ICONS[c.status] ?? "?";
    const detail = c.status === "failed" && c.error ? ` — ${c.error}` : "";
    parts.push(
      `${icon} ${c.connectorName} (${c.connectorType}): ${c.status.replace("_", " ")}${detail}`
    );
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push("• Monitor individual syncs: sync_status with a connector ID.");
  parts.push("• View sync history: sync_history with a connector ID.");
  parts.push("• Cancel a running sync: sync_cancel with a connector ID.");

  return parts.join("\n");
}

type SyncControlResult = {
  connectorId: string;
  action: "cancelled" | "paused" | "resumed";
  affected: number;
};

export function formatSyncControl(r: SyncControlResult): string {
  const parts: string[] = [
    `${r.action.charAt(0).toUpperCase()}${r.action.slice(1)} ${plural(r.affected, "sync workflow")} for connector ${r.connectorId}.`,
  ];

  if (r.affected === 0) {
    parts.push("No active sync workflows found for this connector.");
  }

  parts.push("");
  parts.push("Next steps:");

  if (r.action === "cancelled") {
    parts.push("• Trigger a new sync: sync_trigger with this connector ID.");
  }
  if (r.action === "paused") {
    parts.push("• Resume the sync: sync_resume with this connector ID.");
  }
  if (r.action === "resumed") {
    parts.push("• Check progress: sync_status with this connector ID.");
  }
  parts.push("• View sync history: sync_history with this connector ID.");
  parts.push(
    "• Check connector health: connector_health with this connector ID."
  );

  return parts.join("\n");
}
