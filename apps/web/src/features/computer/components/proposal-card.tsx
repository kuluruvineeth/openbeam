"use client";

import { Badge, Button, Skeleton } from "@openbeam/ui";
import { cn } from "@openbeam/ui/utils/cn";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { useApproveRun, useRejectRun } from "../hooks/use-computer";

interface ProposedAction {
  tool: string;
  args: Record<string, unknown>;
  description?: string;
}

interface ProposalCardProps {
  agentId: string;
  runId: string;
  actions: ProposedAction[];
  status: string;
}

export function ProposalCard({
  agentId,
  runId,
  actions,
  status,
}: ProposalCardProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(actions.map((_, i) => i))
  );
  const approveRun = useApproveRun(agentId, runId);
  const rejectRun = useRejectRun(agentId, runId);

  const isWaiting = status === "WAITING_APPROVAL";
  const allSelected = selected.size === actions.length;

  useHotkeys("mod+enter", () => handleApprove(), {
    enabled: isWaiting && selected.size > 0 && !approveRun.isPending,
  });

  function toggleIndex(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(actions.map((_, i) => i)));
    }
  }

  function handleApprove() {
    const indices = [...selected].sort((a, b) => a - b);
    const partial = indices.length < actions.length;
    approveRun.mutate({
      runId,
      approvedIndices: partial ? indices : undefined,
    });
  }

  if (actions.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-xs">
        No proposed actions
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {actions.length} proposed action{actions.length !== 1 ? "s" : ""}
          </span>
          {isWaiting && (
            <Badge
              className="border-violet-500/20 bg-violet-500/10 text-violet-600"
              variant="outline"
            >
              awaiting approval
            </Badge>
          )}
        </div>
        {isWaiting && (
          <button
            className="text-muted-foreground text-xs hover:text-foreground"
            onClick={toggleAll}
            type="button"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      <div className="space-y-1">
        {actions.map((action, index) => (
          <ActionRow
            action={action}
            index={index}
            isSelectable={isWaiting}
            isSelected={selected.has(index)}
            key={`${action.tool}-${index.toString()}`}
            onToggle={() => toggleIndex(index)}
          />
        ))}
      </div>

      {isWaiting && (
        <div className="flex items-center gap-2 pt-2">
          <Button
            disabled={selected.size === 0 || approveRun.isPending}
            onClick={handleApprove}
            size="sm"
          >
            <Icons.Check size={14} />
            Approve{" "}
            {selected.size < actions.length ? `(${selected.size})` : "all"}
          </Button>
          <Button
            disabled={rejectRun.isPending}
            onClick={() => rejectRun.mutate({ runId })}
            size="sm"
            variant="outline"
          >
            <Icons.Close size={14} />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action,
  index,
  isSelectable,
  isSelected,
  onToggle,
}: {
  action: ProposedAction;
  index: number;
  isSelectable: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-sm border border-border/30 transition-colors",
        isSelected && isSelectable && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2 text-xs">
        {isSelectable && (
          <button
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border"
            )}
            onClick={onToggle}
            type="button"
          >
            {isSelected && <Icons.Check size={10} />}
          </button>
        )}
        <span className="w-5 text-center text-muted-foreground/50">
          {index}
        </span>
        <Badge className="px-1.5 py-0 text-[10px]" variant="outline">
          {action.tool}
        </Badge>
        <span className="flex-1 truncate text-muted-foreground">
          {action.description ?? "\u2014"}
        </span>
        <button
          className="text-muted-foreground/40 hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <Icons.ChevronDown
            className={cn("transition-transform", expanded && "rotate-180")}
            size={12}
          />
        </button>
      </div>

      {expanded && (
        <div className="border-border/20 border-t px-3 py-2">
          <pre className="overflow-x-auto font-mono text-[11px] text-muted-foreground">
            {JSON.stringify(action.args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ProposalCardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton className="h-10 w-full" key={`prop-sk-${i.toString()}`} />
      ))}
    </div>
  );
}
