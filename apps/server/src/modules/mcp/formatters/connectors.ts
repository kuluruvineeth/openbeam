import { num, numbered, plural, relativeTime } from "./helpers";

type ConnectorItem = {
  id: string;
  name?: string | null;
  type?: string | null;
  status?: string | null;
  lastSyncAt?: string | null;
  documentCount?: number | null;
};

type ConnectorDetail = ConnectorItem & {
  errorMessage?: string | null;
  health?: { score?: number | null; status?: string | null } | null;
};

type ConnectorHealth = {
  connectorId: string;
  status: string;
  score?: number | null;
  lastSyncAt?: string | null;
  documentCount?: number | null;
  lastError?: string | null;
};

function statusLabel(status: string | null | undefined, docs: number): string {
  const s = status ?? "UNKNOWN";
  if (s === "ACTIVE" && docs > 0) {
    return "indexed";
  }
  if (s === "ACTIVE") {
    return "ready";
  }
  return s.toLowerCase().replace(/_/g, " ");
}

export function formatConnectorList(items: ConnectorItem[]): string {
  if (items.length === 0) {
    return [
      "No connectors found.",
      "",
      "Next steps:",
      "- Set up a new connector: connector_setup to connect a data source.",
      "- View available connectors: connector_available to see supported integrations.",
      "- Check team info: team_info for an overview of your team.",
    ].join("\n");
  }

  const totalDocs = items.reduce((s, c) => s + (c.documentCount ?? 0), 0);
  const header = `Found ${plural(items.length, "connector")} (${num(totalDocs)} total documents):`;

  const rows = numbered(
    items.map((c) => {
      const docs = c.documentCount ?? 0;
      const status = statusLabel(c.status, docs);
      const sync = relativeTime(c.lastSyncAt);
      return `[${c.id}] ${c.name ?? "Unknown"} (${c.type ?? "unknown"}) — ${status}, ${num(docs)} docs, synced ${sync}`;
    })
  );

  const hints = [
    "Next steps:",
    "• Check health: connector_health with the connector ID.",
    "• Get full details: connector_get with the connector ID.",
    "• Trigger a sync: sync_trigger with the connector ID.",
    "• See write actions (create, update, delete): connector_actions_list with the connector type.",
    "• Search documents from a source: search_documents with a query.",
  ].join("\n");

  return `${header}\n\n${rows}\n\n${hints}`;
}

export function formatConnectorDetail(c: ConnectorDetail): string {
  const docs = c.documentCount ?? 0;
  const status = statusLabel(c.status, docs);
  const parts = [
    `${c.name ?? "Unknown"} (${c.type ?? "unknown"}) [ID: ${c.id}]`,
    `Status: ${status}`,
    `Documents: ${num(docs)}`,
    `Last sync: ${relativeTime(c.lastSyncAt)}`,
  ];

  if (c.errorMessage) {
    parts.push(`Error: ${c.errorMessage}`);
  }

  if (c.health?.score != null) {
    parts.push(`Health score: ${c.health.score}/100`);
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push(`• Trigger a sync: sync_trigger with connector ID "${c.id}".`);
  parts.push(`• Check health: connector_health with connector ID "${c.id}".`);
  parts.push(
    `• See write actions: connector_actions_list with type "${c.type ?? "unknown"}".`
  );
  parts.push(`• View sync history: sync_history with connector ID "${c.id}".`);
  parts.push("• Search its documents: search_documents with a query.");

  return parts.join("\n");
}

export function formatConnectorHealth(h: ConnectorHealth): string {
  const parts = [
    `Connector ${h.connectorId}: ${h.status.toLowerCase()}`,
    h.score != null ? `Health score: ${h.score}/100` : null,
    h.documentCount != null ? `Documents: ${num(h.documentCount)}` : null,
    `Last sync: ${relativeTime(h.lastSyncAt)}`,
    h.lastError ? `Last error: ${h.lastError}` : null,
  ].filter(Boolean);

  parts.push("");
  parts.push("Next steps:");
  parts.push(
    `• Trigger a fresh sync: sync_trigger with connector ID "${h.connectorId}".`
  );
  parts.push(
    `• View sync history: sync_history with connector ID "${h.connectorId}".`
  );
  parts.push(
    `• Get full details: connector_get with connector ID "${h.connectorId}".`
  );
  if (h.lastError) {
    parts.push("• The error above may resolve after a fresh sync.");
  }

  return parts.join("\n");
}
