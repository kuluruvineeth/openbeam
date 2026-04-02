import { plural } from "./helpers";

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
