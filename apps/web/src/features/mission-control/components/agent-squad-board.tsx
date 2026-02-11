"use client";

import type {
  MissionAgentLaneState,
  MissionEventLedgerItem,
} from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useCallback, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/utils";
import { AgentDetailDrawer } from "./agent-detail-drawer";
import { AgentLane } from "./agent-lane";
import { SquadHeader } from "./squad-header";

type AgentStatus = MissionAgentLaneState["status"];

const STATUS_CYCLE: Array<AgentStatus | "all"> = [
  "all",
  "running",
  "blocked",
  "completed",
  "failed",
  "idle",
];

const filterChipVariants = cva(
  "inline-flex cursor-pointer select-none items-center gap-1 rounded-sm px-2 py-0.5 text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-foreground text-background",
        false: "bg-muted text-muted-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

type AgentSquadBoardProps = {
  agents: Record<string, MissionAgentLaneState>;
  events?: MissionEventLedgerItem[];
};

export function AgentSquadBoard({ agents, events = [] }: AgentSquadBoardProps) {
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const agentList = useMemo(() => Object.values(agents), [agents]);

  const filteredAgents = useMemo(
    () =>
      statusFilter === "all"
        ? agentList
        : agentList.filter((a) => a.status === statusFilter),
    [agentList, statusFilter]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agentList.length };
    for (const agent of agentList) {
      counts[agent.status] = (counts[agent.status] ?? 0) + 1;
    }
    return counts;
  }, [agentList]);

  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const cycleFilter = useCallback(() => {
    setStatusFilter((current) => {
      const idx = STATUS_CYCLE.indexOf(current);
      return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    });
    setFocusedIndex(0);
  }, []);

  useHotkeys(
    "j",
    () => {
      setFocusedIndex((i) => Math.min(i + 1, filteredAgents.length - 1));
    },
    { enabled: !drawerOpen && filteredAgents.length > 0 }
  );

  useHotkeys(
    "k",
    () => {
      setFocusedIndex((i) => Math.max(i - 1, 0));
    },
    { enabled: !drawerOpen && filteredAgents.length > 0 }
  );

  useHotkeys(
    "enter",
    () => {
      const agent = filteredAgents[focusedIndex];
      if (agent) {
        handleSelectAgent(agent.agentId);
      }
    },
    { enabled: !drawerOpen && filteredAgents.length > 0 }
  );

  useHotkeys("escape", handleCloseDrawer, { enabled: drawerOpen });

  useHotkeys("f", cycleFilter, { enabled: !drawerOpen });

  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : undefined;

  if (agentList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Icons.Users className="mb-2 opacity-40" size={20} />
        <span className="text-sm">No agents active</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col" ref={containerRef}>
      <SquadHeader agents={agentList} />

      <div className="flex items-center gap-1.5 border-border/50 border-b px-3 py-2">
        {STATUS_CYCLE.filter(
          (s) => s === "all" || (statusCounts[s] ?? 0) > 0
        ).map((status) => (
          <button
            className={cn(
              filterChipVariants({ active: statusFilter === status })
            )}
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setFocusedIndex(0);
            }}
            type="button"
          >
            {status}
            <span className="tabular-nums opacity-70">
              {statusCounts[status] ?? 0}
            </span>
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          j/k navigate &middot; enter detail &middot; f filter
        </span>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {filteredAgents.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No {statusFilter} agents
          </div>
        )}

        {filteredAgents.map((agent, index) => (
          <div
            className={cn(
              "rounded-sm transition-shadow",
              index === focusedIndex && !drawerOpen && "ring-1 ring-primary/40"
            )}
            key={agent.agentId}
          >
            <AgentLane
              agent={agent}
              isSelected={agent.agentId === selectedAgentId}
              onSelect={handleSelectAgent}
            />
          </div>
        ))}
      </div>

      <AgentDetailDrawer
        agent={selectedAgent}
        agentId={selectedAgentId ?? ""}
        events={events}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

export { filterChipVariants };
