"use client";

import { AnimatePresence } from "motion/react";
import { useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { ConnectorCard } from "@/components/connector-card";
import { ConnectorCategoryTabs } from "@/components/connector-category-tabs";
import { ConnectorSearch } from "@/components/connector-search";
import { displayGroups, getConnectorsByGroup } from "@/data/connectors";

interface ConnectorsGridProps {
  initialCategory?: string;
}

export function ConnectorsGrid({
  initialCategory = "all",
}: ConnectorsGridProps) {
  const [group, setGroup] = useQueryState("category", {
    defaultValue: initialCategory,
    shallow: true,
  });
  const [search, setSearch] = useState("");

  const groupConnectors = useMemo(() => getConnectorsByGroup(group), [group]);

  const sorted = useMemo(
    () =>
      [...groupConnectors].sort((a, b) => {
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        return 0;
      }),
    [groupConnectors]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return sorted;
    }
    const query = search.toLowerCase();
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.short_description.toLowerCase().includes(query)
    );
  }, [sorted, search]);

  const handleGroupChange = (id: string) => {
    setGroup(id);
    setSearch("");
  };

  return (
    <div className="pt-32 pb-24">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h1 className="mb-4 font-serif text-3xl text-foreground lg:text-4xl">
            Connectors
          </h1>
          <p className="font-sans text-base text-muted-foreground leading-normal">
            Connect, sync, and search across everything in one place.
          </p>
        </div>

        <ConnectorSearch
          className="mb-10"
          onChange={setSearch}
          value={search}
        />

        <ConnectorCategoryTabs
          activeCategory={group}
          categories={displayGroups}
          className="mb-12"
          onCategoryChange={handleGroupChange}
        />

        {filtered.length === 0 ? (
          <EmptyState onClear={() => setSearch("")} query={search} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((connector, i) => (
                <ConnectorCard
                  connector={connector}
                  index={i}
                  key={connector.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-24 pb-24">
          <div className="relative border border-border bg-background p-8 text-center before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(-60deg,rgba(44,44,44,0.2),rgba(44,44,44,0.2)_1px,transparent_1px,transparent_6px)] lg:p-12">
            <div className="relative z-10">
              <h2 className="mb-4 font-serif text-2xl text-foreground">
                Don&apos;t see what you need?
              </h2>
              <p className="mx-auto mb-6 max-w-lg font-sans text-base text-muted-foreground">
                We&apos;re building connectors at rapid pace. Request an
                integration and we&apos;ll prioritize it.
              </p>
              <a
                className="inline-flex items-center justify-center bg-foreground px-6 py-3 font-sans text-background text-sm transition-opacity hover:opacity-90"
                href="https://github.com/kuluruvineeth/openbeam/issues/new?template=connector_request.md"
                rel="noopener noreferrer"
                target="_blank"
              >
                Request a connector
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="py-24 text-center">
      <p className="mb-2 font-sans text-base text-muted-foreground">
        No connectors match &ldquo;{query}&rdquo;
      </p>
      <button
        className="font-sans text-foreground text-sm underline underline-offset-4 transition-colors hover:text-muted-foreground"
        onClick={onClear}
        type="button"
      >
        Clear search
      </button>
    </div>
  );
}
