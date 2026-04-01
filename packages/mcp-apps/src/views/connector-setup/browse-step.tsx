import { useState } from "react";
import { ConnectorLogo } from "../../shared/connector-logo";
import { EmptyState } from "../../shared/empty-state";
import type { AvailableConnector } from "./types";

type BrowseStepProps = {
  connectors: AvailableConnector[];
  onSelect: (connector: AvailableConnector) => void;
};

function AuthBadge({ type }: { type: string }) {
  const label = type === "OAUTH2" ? "OAuth" : type.replace(/_/g, " ");
  return (
    <span className="rounded-sm bg-foreground/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-foreground/50 uppercase tracking-wide">
      {label}
    </span>
  );
}

function ConnectorCard({
  connector,
  onSelect,
}: {
  connector: AvailableConnector;
  onSelect: () => void;
}) {
  return (
    <button
      className="flex w-full flex-col gap-2.5 rounded-sm border border-border/50 p-3 text-left transition-all hover:border-border hover:shadow-sm"
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between">
        <ConnectorLogo size={32} type={connector.id} />
        {connector.installed && (
          <span className="flex items-center gap-1 rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-sm">{connector.name}</p>
        {connector.shortDescription && (
          <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {connector.shortDescription}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-foreground/40">
          {connector.category}
        </span>
        <AuthBadge type={connector.authType} />
      </div>
    </button>
  );
}

export function BrowseStep({ connectors, onSelect }: BrowseStepProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = [...new Set(connectors.map((c) => c.category))].sort();

  const filtered = connectors.filter((c) => {
    if (category && c.category !== category) {
      return false;
    }
    if (query) {
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.shortDescription?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <input
        className="w-full rounded-sm border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search connectors..."
        type="text"
        value={query}
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          className={`rounded-sm px-2 py-1 text-[10px] transition-colors ${category ? "bg-foreground/[0.04] text-foreground/60 hover:bg-foreground/[0.08]" : "bg-foreground text-background"}`}
          onClick={() => setCategory(null)}
          type="button"
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            className={`rounded-sm px-2 py-1 text-[10px] transition-colors ${category === cat ? "bg-foreground text-background" : "bg-foreground/[0.04] text-foreground/60 hover:bg-foreground/[0.08]"}`}
            key={cat}
            onClick={() => setCategory(cat === category ? null : cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          description={
            query
              ? `Nothing matched "${query}"`
              : "No connectors in this category"
          }
          title="No connectors found"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((connector) => (
            <ConnectorCard
              connector={connector}
              key={connector.id}
              onSelect={() => onSelect(connector)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
