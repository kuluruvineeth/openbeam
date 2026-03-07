"use client";

import type { GoalLevel, GoalStatus } from "@openbeam/types/control";
import { useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { GOAL_STATUS_META } from "../../constants";
import { useControlGoals } from "../../hooks/use-control-goals";
import { EmptyState } from "../shared/empty-state";
import { FilterBar } from "../shared/filter-bar";
import { GoalDetailPanel } from "./goal-detail-panel";
import { type GoalNode, GoalTreeNode } from "./goal-tree-node";
import { NewGoalDialog } from "./new-goal-dialog";

const STATUS_OPTIONS = Object.entries(GOAL_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

type GoalRecord = {
  id: string;
  title: string;
  description: string | null;
  level: GoalLevel;
  status: GoalStatus;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function buildTree(
  goals: GoalRecord[],
  search: string,
  statuses: string[]
): GoalNode[] {
  const filtered = goals.filter((g) => {
    if (search && !g.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statuses.length > 0 && !statuses.includes(g.status)) {
      return false;
    }
    return true;
  });

  const map = new Map<string, GoalNode>();
  for (const g of filtered) {
    map.set(g.id, { ...g, children: [] });
  }

  const roots: GoalNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function GoalsView() {
  const { data: goals, isLoading } = useControlGoals();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);

  const tree = useMemo(
    () => buildTree((goals ?? []) as GoalRecord[], search, activeStatuses),
    [goals, search, activeStatuses]
  );

  const activeFilterCount = (search ? 1 : 0) + activeStatuses.length;

  function toggleStatus(status: string) {
    setActiveStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-lg">Goals</h1>
        <NewGoalDialog />
      </div>

      <FilterBar
        activeFilterCount={activeFilterCount}
        activeStatuses={activeStatuses}
        onClearFilters={() => {
          setSearch("");
          setActiveStatuses([]);
        }}
        onSearchChange={setSearch}
        onStatusToggle={toggleStatus}
        search={search}
        statusOptions={STATUS_OPTIONS}
      />

      {!isLoading && tree.length === 0 ? (
        <EmptyState
          description="Define goals to align agent work"
          icon={<Icons.Target size={32} />}
          title="No goals"
        />
      ) : (
        <div className="rounded-sm border border-border/50">
          {tree.map((node) => (
            <GoalTreeNode
              key={node.id}
              node={node}
              onSelect={setSelectedGoalId}
            />
          ))}
        </div>
      )}

      <GoalDetailPanel
        goalId={selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
      />
    </div>
  );
}
