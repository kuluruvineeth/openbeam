"use client";

import { useCallback, useMemo, useState } from "react";

type MemoryScope = "all" | "mission" | "agent" | "task";

type MemoryEntry = {
  key: string;
  value: unknown;
  scope: MemoryScope;
  agentName?: string;
  taskId?: string;
  updatedAt: number;
  updatedBy: string;
};

type UseMemoryOptions = {
  missionId: string;
  scope: MemoryScope;
  agentName?: string;
  searchQuery?: string;
};

type UseMemoryReturn = {
  entries: MemoryEntry[];
  isLoading: boolean;
  writeEntry: (key: string, value: unknown, scope: MemoryScope) => void;
  deleteEntry: (key: string) => void;
  exportMemory: () => void;
};

const INITIAL_ENTRIES: MemoryEntry[] = [
  {
    key: "objective",
    value: "Research competitor landscape and produce executive summary",
    scope: "mission",
    updatedAt: Date.now() - 3_600_000,
    updatedBy: "system",
  },
  {
    key: "competitor_analysis",
    value: { companies: ["Glean", "Guru", "Moveworks"], status: "in-progress" },
    scope: "mission",
    updatedAt: Date.now() - 1_800_000,
    updatedBy: "Researcher",
  },
  {
    key: "research_findings",
    value:
      "Based on Q3 data, market growth is accelerating at 24% YoY. Key drivers include enterprise AI adoption and hybrid work infrastructure investment.",
    scope: "mission",
    updatedAt: Date.now() - 900_000,
    updatedBy: "Analyst",
  },
  {
    key: "search_queries_used",
    value: [
      "enterprise search market 2026",
      "Glean vs Guru comparison",
      "AI workplace tools funding",
    ],
    scope: "agent",
    agentName: "Researcher",
    updatedAt: Date.now() - 600_000,
    updatedBy: "Researcher",
  },
  {
    key: "draft_section_1",
    value:
      "Market Overview: The enterprise search market reached $4.2B in 2025...",
    scope: "task",
    taskId: "task-001",
    updatedAt: Date.now() - 300_000,
    updatedBy: "Writer",
  },
];

function downloadJson(entries: MemoryEntry[], missionId: string) {
  const data = JSON.stringify(entries, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mission-memory-${missionId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function matchesSearch(entry: MemoryEntry, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  if (entry.key.toLowerCase().includes(lowerQuery)) {
    return true;
  }
  const stringified =
    typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value);
  return stringified.toLowerCase().includes(lowerQuery);
}

export function useMemory({
  missionId,
  scope,
  agentName,
  searchQuery,
}: UseMemoryOptions): UseMemoryReturn {
  const [entries, setEntries] = useState<MemoryEntry[]>(INITIAL_ENTRIES);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (scope !== "all") {
      result = result.filter((e) => e.scope === scope);
    }

    if (agentName) {
      result = result.filter((e) => e.agentName === agentName);
    }

    if (searchQuery) {
      result = result.filter((e) => matchesSearch(e, searchQuery));
    }

    return result;
  }, [entries, scope, agentName, searchQuery]);

  const writeEntry = useCallback(
    (key: string, value: unknown, entryScope: MemoryScope) => {
      setEntries((prev) => {
        const existing = prev.findIndex((e) => e.key === key);
        const entry: MemoryEntry = {
          key,
          value,
          scope: entryScope,
          updatedAt: Date.now(),
          updatedBy: "user",
        };

        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], ...entry };
          return next;
        }

        return [...prev, entry];
      });
    },
    []
  );

  const deleteEntry = useCallback((key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }, []);

  const exportMemory = useCallback(() => {
    downloadJson(filteredEntries, missionId);
  }, [filteredEntries, missionId]);

  return {
    entries: filteredEntries,
    isLoading: false,
    writeEntry,
    deleteEntry,
    exportMemory,
  };
}

export type { MemoryEntry, MemoryScope, UseMemoryOptions, UseMemoryReturn };
