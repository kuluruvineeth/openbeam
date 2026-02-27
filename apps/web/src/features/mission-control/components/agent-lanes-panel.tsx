"use client";

import type {
  MissionAgentLaneState,
  MissionApprovalQueueItem,
} from "@openplane/types/mission-control";
import { Button, Icons } from "@openplane/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getVanillaTRPCClient, useTRPC } from "@/trpc/client";
import {
  buildSpecialistSections,
  partitionAgentsForTree,
} from "../lib/agent-panel-layout";
import { formatRelativeTimestamp } from "../lib/time-display";
import {
  useAgentBoard,
  usePendingApprovals,
} from "../stores/mission-runtime-store";

type AgentLanesPanelProps = {
  missionId: string;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  onCollapse?: () => void;
};

const STATUS_DOT_CLASS: Record<MissionAgentLaneState["status"], string> = {
  running: "bg-emerald-500",
  blocked: "bg-amber-500",
  failed: "bg-destructive",
  completed: "bg-primary/70",
  idle: "bg-muted-foreground/50",
};

function progressSummary(agent: MissionAgentLaneState): string {
  if (agent.totalSteps && agent.totalSteps > 0) {
    return `${agent.stepsCompleted}/${agent.totalSteps}`;
  }
  if (agent.stepsCompleted > 0) {
    return `${agent.stepsCompleted}`;
  }
  return "--";
}

function formatRelativeActivityLabel(
  timestamp: number | undefined,
  nowMs: number
): string | null {
  if (typeof timestamp !== "number") {
    return null;
  }

  return formatRelativeTimestamp(timestamp, nowMs);
}

function TreeDisclosure({
  open,
  label,
  count,
}: {
  open: boolean;
  label: string;
  count?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
      <span className="font-mono text-[11px]">{open ? "▾" : "▸"}</span>
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="rounded-sm bg-muted px-1 py-0.5 text-[10px] tabular-nums">
          {count}
        </span>
      )}
    </span>
  );
}

function ApprovalActions({
  pendingApproval,
  onApprove,
  onReject,
}: {
  pendingApproval: MissionApprovalQueueItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="ml-2 flex shrink-0 items-center gap-1">
      <Button
        className="h-5 px-1.5 text-[10px]"
        onClick={() => onApprove(pendingApproval.approvalId)}
        size="sm"
        variant="outline"
      >
        Approve
      </Button>
      <Button
        className="h-5 px-1.5 text-[10px]"
        onClick={() => onReject(pendingApproval.approvalId)}
        size="sm"
        variant="ghost"
      >
        Reject
      </Button>
    </div>
  );
}

function AgentTreeRow({
  agent,
  depth,
  selectedAgentId,
  pendingApproval,
  nowMs,
  onSelect,
  onApprove,
  onReject,
}: {
  agent: MissionAgentLaneState;
  depth: number;
  selectedAgentId: string | null;
  pendingApproval: MissionApprovalQueueItem | undefined;
  nowMs: number;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const dotClass = STATUS_DOT_CLASS[agent.status];
  const updatedLabel = formatRelativeActivityLabel(agent.lastActivityAt, nowMs);
  const taskLabel = agent.currentTaskTitle ?? (agent.role || "No active task");
  const updatedDateTime =
    typeof agent.lastActivityAt === "number"
      ? new Date(agent.lastActivityAt).toISOString()
      : null;
  const isSelected = selectedAgentId === agent.agentId;
  const progress = progressSummary(agent);

  return (
    <div
      className={cn(
        "group flex items-center rounded-sm border px-1.5 py-1 transition-colors",
        isSelected
          ? "border-primary/35 bg-primary/[0.08]"
          : "border-transparent hover:border-border/40 hover:bg-muted/30"
      )}
      style={{ marginLeft: `${depth * 12}px` }}
    >
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onSelect(agent.agentId)}
        type="button"
      >
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
          <span className="truncate font-medium text-[12px]">
            {agent.agentName}
          </span>
        </div>
        <div className="mt-0.5 ml-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="truncate">{taskLabel}</span>
          {progress !== "--" && (
            <span className="shrink-0 font-mono tabular-nums">{progress}</span>
          )}
          {updatedLabel && updatedDateTime && (
            <time className="ml-auto shrink-0" dateTime={updatedDateTime}>
              {updatedLabel}
            </time>
          )}
        </div>
      </button>

      {pendingApproval && (
        <ApprovalActions
          onApprove={onApprove}
          onReject={onReject}
          pendingApproval={pendingApproval}
        />
      )}
    </div>
  );
}

type AgentFlatItem =
  | {
      kind: "section-header";
      key: string;
      label: string;
      description: string;
      count: number;
    }
  | { kind: "agent"; agent: MissionAgentLaneState; depth: number };

const AGENT_SECTION_HEADER_HEIGHT = 28;
const AGENT_ROW_HEIGHT = 48;

export function AgentLanesPanel({
  missionId,
  selectedAgentId,
  onSelectAgent,
  onCollapse,
}: AgentLanesPanelProps) {
  "use no memo";
  const agentBoard = useAgentBoard();
  const pendingApprovals = usePendingApprovals();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.missionControl.get.queryOptions({ missionId }).queryKey;

  const approveMutation = useMutation({
    mutationFn: (approvalId: string) =>
      getVanillaTRPCClient().missionControl.resolveApproval.mutate({
        missionId,
        approvalId,
        approved: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const rejectMutation = useMutation({
    mutationFn: (approvalId: string) =>
      getVanillaTRPCClient().missionControl.resolveApproval.mutate({
        missionId,
        approvalId,
        approved: false,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleApprove = useCallback(
    (id: string) => approveMutation.mutate(id),
    [approveMutation]
  );

  const handleReject = useCallback(
    (id: string) => rejectMutation.mutate(id),
    [rejectMutation]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const nowMs = Date.now();
  const agents = useMemo(() => Object.values(agentBoard), [agentBoard]);
  const { leads, specialists } = useMemo(
    () => partitionAgentsForTree(agents),
    [agents]
  );
  const specialistSections = useMemo(
    () => buildSpecialistSections(specialists),
    [specialists]
  );
  const primaryLead = leads[0] ?? null;
  const additionalLeads = leads.slice(1);

  const approvalsByAgent = useMemo(() => {
    const map = new Map<string, (typeof pendingApprovals)[number]>();
    for (const approval of pendingApprovals) {
      if (approval.agentId) {
        map.set(approval.agentId, approval);
      }
    }
    return map;
  }, [pendingApprovals]);

  const handleSelect = useCallback(
    (id: string) => onSelectAgent(id === selectedAgentId ? null : id),
    [onSelectAgent, selectedAgentId]
  );

  const [closedSections, setClosedSections] = useState<Set<string>>(
    () => new Set(["done"])
  );

  const toggleSection = useCallback((key: string) => {
    setClosedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const flatSpecialists = useMemo(() => {
    const items: AgentFlatItem[] = [];
    for (const section of specialistSections) {
      if (section.agents.length === 0) {
        continue;
      }
      items.push({
        kind: "section-header",
        key: section.key,
        label: section.label,
        description: section.description,
        count: section.agents.length,
      });
      if (!closedSections.has(section.key)) {
        const isSpawned = section.key === "spawned";
        for (const agent of section.agents) {
          items.push({
            kind: "agent",
            agent,
            depth: isSpawned ? (agent.spawnDepth ?? 0) : 0,
          });
        }
      }
    }
    return items;
  }, [specialistSections, closedSections]);

  const virtualizer = useVirtualizer({
    count: flatSpecialists.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) =>
      flatSpecialists[index]?.kind === "section-header"
        ? AGENT_SECTION_HEADER_HEIGHT
        : AGENT_ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-border/50 border-b px-3 py-2 dark:border-[#1d1d1d]">
        {onCollapse && (
          <button
            aria-label="Collapse squad panel"
            className="inline-flex items-center justify-center rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={onCollapse}
            type="button"
          >
            <Icons.SidebarRight size={13} />
          </button>
        )}
        <span className="font-medium text-xs">Squad</span>
        <span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[10px] tabular-nums">
          {agents.length}
        </span>
        {selectedAgentId && (
          <button
            className="ml-auto rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            onClick={() => onSelectAgent(null)}
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto" ref={parentRef}>
        {agents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <span className="text-sm">No agents assigned</span>
          </div>
        )}

        {agents.length > 0 && (
          <div className="flex flex-col gap-2 p-2">
            {primaryLead && (
              <div className="rounded-sm border border-border/60 p-1.5">
                <AgentTreeRow
                  agent={primaryLead}
                  depth={0}
                  nowMs={nowMs}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onSelect={handleSelect}
                  pendingApproval={approvalsByAgent.get(primaryLead.agentId)}
                  selectedAgentId={selectedAgentId}
                />
              </div>
            )}

            {flatSpecialists.length > 0 && (
              <div
                className="relative"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
              >
                {virtualizer.getVirtualItems().map((vi) => {
                  const item = flatSpecialists[vi.index];
                  if (!item) {
                    return null;
                  }
                  if (item.kind === "section-header") {
                    return (
                      <div
                        className="absolute top-0 left-0 w-full"
                        data-index={vi.index}
                        key={`section-${item.key}`}
                        ref={virtualizer.measureElement}
                        style={{ transform: `translateY(${vi.start}px)` }}
                      >
                        <button
                          aria-expanded={!closedSections.has(item.key)}
                          className="flex w-full items-center justify-between rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-muted/30"
                          onClick={() => toggleSection(item.key)}
                          type="button"
                        >
                          <TreeDisclosure
                            count={item.count}
                            label={item.label}
                            open={!closedSections.has(item.key)}
                          />
                          <span className="truncate text-[10px] text-muted-foreground/80">
                            {item.description}
                          </span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      className="absolute top-0 left-0 w-full"
                      data-index={vi.index}
                      key={item.agent.agentId}
                      ref={virtualizer.measureElement}
                      style={{
                        transform: `translateY(${vi.start}px)`,
                        paddingLeft: `${item.depth * 12}px`,
                      }}
                    >
                      <AgentTreeRow
                        agent={item.agent}
                        depth={0}
                        nowMs={nowMs}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onSelect={handleSelect}
                        pendingApproval={approvalsByAgent.get(
                          item.agent.agentId
                        )}
                        selectedAgentId={selectedAgentId}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {additionalLeads.length > 0 && (
              <div className="rounded-sm border border-border/50 p-1.5">
                <p className="mb-1 px-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                  Additional leads
                </p>
                <div className="space-y-1">
                  {additionalLeads.map((lead) => (
                    <AgentTreeRow
                      agent={lead}
                      depth={0}
                      key={lead.agentId}
                      nowMs={nowMs}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onSelect={handleSelect}
                      pendingApproval={approvalsByAgent.get(lead.agentId)}
                      selectedAgentId={selectedAgentId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
