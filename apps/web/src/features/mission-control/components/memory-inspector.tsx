"use client";

import { Button, Icons, Input } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { MemoryEntry, MemoryScope } from "../hooks/use-memory";
import { useMemory } from "../hooks/use-memory";
import { MemoryEditDialog } from "./memory-edit-dialog";
import { MemoryTable } from "./memory-table";
import { MemoryTimeline } from "./memory-timeline";

const SCOPES: MemoryScope[] = ["all", "mission", "agent", "task"];

const scopeToggleVariants = cva(
  "rounded-sm px-2.5 py-1 font-medium text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted",
      },
    },
    defaultVariants: { active: false },
  }
);

const viewToggleVariants = cva("rounded-sm p-1 transition-colors", {
  variants: {
    active: {
      true: "bg-accent text-accent-foreground",
      false: "text-muted-foreground hover:bg-muted",
    },
  },
  defaultVariants: { active: false },
});

type ViewMode = "table" | "timeline";

const DEBOUNCE_MS = 150;

type MemoryInspectorProps = {
  missionId: string;
  agents: { id: string; name: string }[];
};

export function MemoryInspector({ missionId, agents }: MemoryInspectorProps) {
  const [scope, setScope] = useState<MemoryScope>("all");
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MemoryEntry | undefined>();

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchInput),
      DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { entries, writeEntry, deleteEntry, exportMemory } = useMemory({
    missionId,
    scope,
    agentName: scope === "agent" ? selectedAgent : undefined,
    searchQuery: debouncedSearch || undefined,
  });

  const handleEdit = useCallback((entry: MemoryEntry) => {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingEntry(undefined);
    setEditDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditingEntry(undefined);
  }, []);

  const handleSave = useCallback(
    (key: string, value: unknown, entryScope: MemoryScope) => {
      writeEntry(key, value, entryScope);
    },
    [writeEntry]
  );

  useHotkeys("escape", handleCloseDialog, { enabled: editDialogOpen });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-sm">Memory</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.Search
              className="-translate-y-1/2 absolute top-1/2 left-2 text-muted-foreground"
              size={14}
            />
            <Input
              className="h-7 w-48 pl-7 text-xs"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              value={searchInput}
            />
          </div>
          <Button onClick={exportMemory} size="sm" variant="outline">
            <Icons.Download size={14} />
            Export
          </Button>
          <Button onClick={handleCreate} size="sm" variant="outline">
            <Icons.Plus size={14} />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5 rounded-sm border border-border/50 p-0.5">
            {SCOPES.map((s) => (
              <button
                className={scopeToggleVariants({ active: scope === s })}
                key={s}
                onClick={() => {
                  setScope(s);
                  if (s !== "agent") {
                    setSelectedAgent(undefined);
                  }
                }}
                type="button"
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {scope === "agent" && agents.length > 0 && (
            <select
              className="h-7 rounded-sm border border-border/50 bg-background px-2 text-xs focus:border-primary focus:outline-none"
              onChange={(e) => setSelectedAgent(e.target.value || undefined)}
              value={selectedAgent ?? ""}
            >
              <option value="">All agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.name}>
                  {agent.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            className={viewToggleVariants({ active: viewMode === "table" })}
            onClick={() => setViewMode("table")}
            title="Table view"
            type="button"
          >
            <Icons.Table size={14} />
          </button>
          <button
            className={viewToggleVariants({ active: viewMode === "timeline" })}
            onClick={() => setViewMode("timeline")}
            title="Timeline view"
            type="button"
          >
            <Icons.Clock size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {viewMode === "table" ? (
          <MemoryTable
            entries={entries}
            onDelete={deleteEntry}
            onEdit={handleEdit}
          />
        ) : (
          <MemoryTimeline entries={entries} />
        )}
      </div>

      <MemoryEditDialog
        agents={agents}
        entry={editingEntry}
        isOpen={editDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
    </div>
  );
}

export {
  scopeToggleVariants as inspectorScopeToggleVariants,
  viewToggleVariants as inspectorViewToggleVariants,
};
