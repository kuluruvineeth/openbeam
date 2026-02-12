"use client";

import type {
  MissionAgentLaneState,
  MissionApprovalQueueItem,
} from "@openplane/types/mission-control";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ScrollArea,
} from "@openplane/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getVanillaTRPCClient, useTRPC } from "@/trpc/client";
import {
  buildSpecialistSections,
  partitionAgentsForTree,
  type SpecialistSection,
} from "../lib/agent-panel-layout";
import { summarizeAgentStatuses } from "../lib/agent-status-summary";
import { formatCents } from "../lib/budget-utils";
import { formatRelativeTimestamp } from "../lib/time-display";
import {
  useAgentBoard,
  usePendingApprovals,
} from "../stores/mission-runtime-store";

type AgentLanesPanelProps = {
  missionId: string;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
};

const STATUS_STYLES: Record<
  MissionAgentLaneState["status"],
  {
    dotClass: string;
    labelClass: string;
    label: string;
  }
> = {
  running: {
    dotClass: "bg-emerald-500",
    labelClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    label: "Running",
  },
  blocked: {
    dotClass: "bg-amber-500",
    labelClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    label: "Blocked",
  },
  failed: {
    dotClass: "bg-destructive",
    labelClass: "border-destructive/25 bg-destructive/10 text-destructive",
    label: "Failed",
  },
  completed: {
    dotClass: "bg-primary/70",
    labelClass: "border-border/60 bg-muted/40 text-muted-foreground",
    label: "Done",
  },
  idle: {
    dotClass: "bg-muted-foreground/50",
    labelClass: "border-border/60 bg-muted/40 text-muted-foreground",
    label: "Idle",
  },
};

function progressSummary(agent: MissionAgentLaneState): string {
  if (agent.totalSteps && agent.totalSteps > 0) {
    return `${agent.stepsCompleted}/${agent.totalSteps}`;
  }
  if (agent.stepsCompleted > 0) {
    return `${agent.stepsCompleted} ${agent.stepsCompleted === 1 ? "step" : "steps"}`;
  }
  return "--";
}

function latestTool(agent: MissionAgentLaneState): string {
  const tool = agent.recentToolCalls.at(-1);
  if (!tool) {
    return "";
  }
  return tool.toolName;
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

function AgentMetricChip({
  value,
  tone = "neutral",
}: {
  value: string;
  tone?: "neutral" | "active" | "blocked" | "critical";
}) {
  const toneClass: Record<NonNullable<typeof tone>, string> = {
    active:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blocked:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    critical: "border-destructive/25 bg-destructive/10 text-destructive",
    neutral: "border-border/60 bg-muted/40 text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] tabular-nums",
        toneClass[tone]
      )}
    >
      {value}
    </span>
  );
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
  trailingLabel,
  showStatusBadge = true,
}: {
  agent: MissionAgentLaneState;
  depth: number;
  selectedAgentId: string | null;
  pendingApproval: MissionApprovalQueueItem | undefined;
  nowMs: number;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  trailingLabel?: ReactNode;
  showStatusBadge?: boolean;
}) {
  const style = STATUS_STYLES[agent.status];
  const updatedLabel = formatRelativeActivityLabel(agent.lastActivityAt, nowMs);
  const secondaryLabel =
    agent.currentTaskTitle ?? (agent.role || "No active task");
  const toolLabel = latestTool(agent);
  const updatedDateTime =
    typeof agent.lastActivityAt === "number"
      ? new Date(agent.lastActivityAt).toISOString()
      : null;
  const isSelected = selectedAgentId === agent.agentId;
  const shouldShowStatusBadge = showStatusBadge || agent.status === "failed";

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
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dotClass)} />
          <p className="truncate font-medium text-[12px]">{agent.agentName}</p>
          {shouldShowStatusBadge && (
            <span
              className={cn(
                "inline-flex items-center rounded-sm border px-1 py-0.5 text-[10px]",
                style.labelClass
              )}
            >
              {style.label}
            </span>
          )}
          {trailingLabel}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
            {progressSummary(agent)}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {formatCents(agent.costCents)}
          </span>
        </div>
        <div className="mt-0.5 ml-3 flex items-center gap-2 pl-1.5 text-[10px] text-muted-foreground">
          <span className="truncate">{secondaryLabel}</span>
          {toolLabel.length > 0 && (
            <span className="truncate">{toolLabel}</span>
          )}
          {updatedLabel && updatedDateTime && (
            <time className="shrink-0" dateTime={updatedDateTime}>
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

function SpecialistSectionBranch({
  section,
  selectedAgentId,
  approvalsByAgent,
  nowMs,
  onSelect,
  onApprove,
  onReject,
}: {
  section: SpecialistSection;
  selectedAgentId: string | null;
  approvalsByAgent: Map<string, MissionApprovalQueueItem>;
  nowMs: number;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const defaultOpen = section.key !== "done";
  const [open, setOpen] = useState(defaultOpen);

  if (section.agents.length === 0) {
    return null;
  }

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-muted/30"
          type="button"
        >
          <TreeDisclosure
            count={section.agents.length}
            label={section.label}
            open={open}
          />
          <span className="truncate text-[10px] text-muted-foreground/80">
            {section.description}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="relative mt-1 ml-1 pl-3">
          <div className="-translate-x-1 absolute top-0 bottom-1 left-0 w-px bg-border/55" />
          <ul className="space-y-1">
            {section.agents.map((agent) => (
              <li className="relative" key={agent.agentId}>
                <div className="-translate-y-1/2 -left-2 absolute top-1/2 h-px w-2 bg-border/55" />
                <AgentTreeRow
                  agent={agent}
                  depth={0}
                  nowMs={nowMs}
                  onApprove={onApprove}
                  onReject={onReject}
                  onSelect={onSelect}
                  pendingApproval={approvalsByAgent.get(agent.agentId)}
                  selectedAgentId={selectedAgentId}
                  showStatusBadge={false}
                />
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AgentLanesPanel({
  missionId,
  selectedAgentId,
  onSelectAgent,
}: AgentLanesPanelProps) {
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
  const overallCounts = useMemo(() => summarizeAgentStatuses(agents), [agents]);
  const lastActivityAt = useMemo(
    () =>
      agents.reduce(
        (latest, agent) => Math.max(latest, agent.lastActivityAt ?? 0),
        0
      ),
    [agents]
  );
  const lastActivityLabel =
    lastActivityAt > 0 ? formatRelativeTimestamp(lastActivityAt, nowMs) : null;
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-border/50 border-b px-3 py-2 dark:border-[#1d1d1d]">
        <span className="font-medium text-xs">Squad</span>
        <AgentMetricChip value={`${agents.length} total`} />
        {overallCounts.running > 0 && (
          <AgentMetricChip
            tone="active"
            value={`${overallCounts.running} active`}
          />
        )}
        {overallCounts.blocked + overallCounts.failed > 0 && (
          <AgentMetricChip
            tone="blocked"
            value={`${overallCounts.blocked + overallCounts.failed} attention`}
          />
        )}
        {pendingApprovals.length > 0 && (
          <AgentMetricChip
            tone="critical"
            value={`${pendingApprovals.length} approvals`}
          />
        )}
        {overallCounts.completed > 0 && (
          <AgentMetricChip
            tone="neutral"
            value={`${overallCounts.completed} done`}
          />
        )}

        {(lastActivityLabel || selectedAgentId) && (
          <div className="ml-auto flex items-center gap-2">
            {lastActivityLabel && (
              <span className="text-[10px] text-muted-foreground">
                Updated {lastActivityLabel}
              </span>
            )}
            {selectedAgentId && (
              <button
                className="rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                onClick={() => onSelectAgent(null)}
                type="button"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
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
                  trailingLabel={
                    specialists.length > 0 ? (
                      <span className="text-[10px] text-muted-foreground">
                        orchestrating {specialists.length}
                      </span>
                    ) : undefined
                  }
                />

                {specialists.length > 0 && (
                  <div className="relative mt-1 ml-3 pl-3">
                    <div className="absolute top-0 bottom-1 left-0 w-px bg-border/60" />
                    <div className="space-y-1">
                      {specialistSections.map((section) => (
                        <SpecialistSectionBranch
                          approvalsByAgent={approvalsByAgent}
                          key={section.key}
                          nowMs={nowMs}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onSelect={handleSelect}
                          section={section}
                          selectedAgentId={selectedAgentId}
                        />
                      ))}
                    </div>
                  </div>
                )}
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

            {!primaryLead && specialists.length > 0 && (
              <div className="rounded-sm border border-border/60 p-1.5">
                <p className="mb-1 px-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                  Specialists
                </p>
                <div className="space-y-1">
                  {specialistSections.map((section) => (
                    <SpecialistSectionBranch
                      approvalsByAgent={approvalsByAgent}
                      key={section.key}
                      nowMs={nowMs}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onSelect={handleSelect}
                      section={section}
                      selectedAgentId={selectedAgentId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
