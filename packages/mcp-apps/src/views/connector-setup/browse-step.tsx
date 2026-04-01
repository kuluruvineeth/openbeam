import { useState } from "react";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { AvailableConnector } from "./types";

type BrowseStepProps = {
  connectors: AvailableConnector[];
  onSelect: (connector: AvailableConnector) => void;
};

export function BrowseStep({ connectors, onSelect }: BrowseStepProps) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? connectors.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : connectors;

  return (
    <div className="flex flex-col gap-3">
      <input
        className="w-full rounded-sm border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search connectors..."
        type="text"
        value={query}
      />

      <div className="flex flex-col divide-y divide-border/30">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-xs">
            No connectors match &ldquo;{query}&rdquo;
          </div>
        )}
        {filtered.map((connector) => (
          <button
            className="flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-foreground/3"
            key={connector.id}
            onClick={() => onSelect(connector)}
            type="button"
          >
            <ConnectorLogo size={24} type={connector.id} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-foreground/90">
                {connector.name}
              </p>
              <p className="text-[10px] text-foreground/40">
                {connector.category} · {connector.authType}
              </p>
            </div>
            {connector.installed && (
              <span className="shrink-0 rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
                Connected
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
