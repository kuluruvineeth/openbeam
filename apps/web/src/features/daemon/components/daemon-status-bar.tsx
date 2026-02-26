"use client";

import { cn, Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useMemo } from "react";
import {
  type DaemonConnectionStatus,
  useDaemonConnections,
} from "../hooks/use-daemon-connection";
import { useSessionStore } from "../stores/session-store";

const statusDotVariants = cva("inline-block size-1.5 rounded-full", {
  variants: {
    status: {
      online: "bg-emerald-500",
      connecting: "animate-pulse bg-amber-500",
      offline: "bg-muted-foreground/40",
      error: "bg-destructive",
    },
  },
  defaultVariants: {
    status: "offline",
  },
});

const STATUS_LABELS: Record<DaemonConnectionStatus, string> = {
  online: "Connected",
  connecting: "Connecting...",
  offline: "Offline",
  error: "Connection error",
};

function AgentCountBadge({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
      <Icons.BotIcon className="size-3" />
      {count}
    </span>
  );
}

export interface DaemonStatusBarProps {
  serverId: string;
  className?: string;
}

export function DaemonStatusBar({ serverId, className }: DaemonStatusBarProps) {
  const { connectionStates } = useDaemonConnections();
  const record = connectionStates.get(serverId);
  const serverInfo = useSessionStore(
    (s) => s.sessions[serverId]?.serverInfo ?? null
  );
  const agents = useSessionStore((s) => s.sessions[serverId]?.agents);

  const status: DaemonConnectionStatus = record?.status ?? "offline";

  const runningAgentCount = useMemo(() => {
    if (!agents) {
      return 0;
    }
    let count = 0;
    for (const agent of agents.values()) {
      if (agent.status === "running") {
        count += 1;
      }
    }
    return count;
  }, [agents]);

  const totalAgentCount = agents?.size ?? 0;

  return (
    <div
      className={cn(
        "flex h-7 items-center gap-3 border-border/30 border-t bg-background px-3 text-[11px]",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={statusDotVariants({ status })} />
        <span className="text-muted-foreground">{STATUS_LABELS[status]}</span>
      </span>

      {serverInfo?.version && (
        <span className="text-muted-foreground/50">v{serverInfo.version}</span>
      )}

      {serverInfo?.hostname && (
        <span className="text-muted-foreground/50">{serverInfo.hostname}</span>
      )}

      <div className="flex-1" />

      {totalAgentCount > 0 && (
        <span className="inline-flex items-center gap-2">
          <AgentCountBadge count={totalAgentCount} />
          {runningAgentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Icons.Loader2 className="size-3 animate-spin" />
              <span className="tabular-nums">{runningAgentCount} active</span>
            </span>
          )}
        </span>
      )}
    </div>
  );
}
