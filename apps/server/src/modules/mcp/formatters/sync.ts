import { num, relativeTime } from "./helpers";

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
    "To check progress: use sync_status with this connector ID.",
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
  parts.push("To trigger a new sync: use sync_trigger with this connector ID.");
  parts.push("To see past syncs: use sync_history.");

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

  return `Sync history (${total} total runs):\n\n${rows.join("\n")}`;
}
