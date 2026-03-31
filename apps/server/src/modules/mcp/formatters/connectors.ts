import { num, numbered, plural, relativeTime } from "./helpers";

type ConnectorItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt?: string | null;
  documentCount: number;
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

function statusLabel(status: string, docs: number): string {
  if (status === "ACTIVE" && docs > 0) {
    return "indexed";
  }
  if (status === "ACTIVE") {
    return "ready";
  }
  return status.toLowerCase().replace(/_/g, " ");
}

export function formatConnectorList(items: ConnectorItem[]): string {
  const totalDocs = items.reduce((s, c) => s + c.documentCount, 0);
  const header = `Found ${plural(items.length, "connector")} (${num(totalDocs)} total documents):`;

  const rows = numbered(
    items.map((c) => {
      const status = statusLabel(c.status, c.documentCount);
      const sync = relativeTime(c.lastSyncAt);
      return `${c.name} (${c.type}) — ${status}, ${num(c.documentCount)} docs, synced ${sync}`;
    })
  );

  const hints = [
    "To sync a connector: use sync_trigger with the connector ID.",
    "To see available write actions: use connector_actions_list with the connector type.",
    "To get full details: use connector_get with the connector ID.",
  ].join("\n");

  return `${header}\n\n${rows}\n\n${hints}`;
}

export function formatConnectorDetail(c: ConnectorDetail): string {
  const status = statusLabel(c.status, c.documentCount);
  const parts = [
    `${c.name} (${c.type})`,
    `Status: ${status}`,
    `Documents: ${num(c.documentCount)}`,
    `Last sync: ${relativeTime(c.lastSyncAt)}`,
  ];

  if (c.errorMessage) {
    parts.push(`Error: ${c.errorMessage}`);
  }

  if (c.health?.score != null) {
    parts.push(`Health score: ${c.health.score}/100`);
  }

  parts.push("");
  parts.push("To trigger a sync: use sync_trigger with this connector's ID.");
  parts.push(
    'To see write actions: use connector_actions_list with type "' +
      c.type +
      '".'
  );

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

  return parts.join("\n");
}
