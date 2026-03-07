"use client";

import { Icons } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import { useEffect, useRef } from "react";
import { MAX_CONTENT_WIDTH } from "../constants";
import {
  type AgentScreenMachineInput,
  useAgentScreenStateMachine,
} from "../hooks/use-agent-screen-state-machine";
import { useAgentStreamItems } from "../hooks/use-agent-snapshot";
import { useDaemonConnectionStatus } from "../hooks/use-daemon-connection";
import { getAgentStatusLabel } from "../lib/agent-status";
import { shortenPath } from "../lib/shorten-path";
import { type Agent, useSessionStore } from "../stores/session-store";
import type { StreamItem } from "../types";
import { AgentChatInput } from "./agent-chat-input";
import { AgentStatusDot } from "./agent-status-dot";

function AgentHeader({ agent }: { agent: Agent }) {
  const title = agent.title ?? "New agent";
  const path = shortenPath(agent.cwd);
  const statusLabel = getAgentStatusLabel(agent.status);

  return (
    <div className="flex items-center gap-3 border-border/30 border-b px-4 py-2.5">
      <AgentStatusDot
        requiresAttention={agent.requiresAttention}
        status={agent.status}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate font-medium text-foreground text-sm">
          {title}
        </span>
        <span className="truncate text-muted-foreground text-xs">{path}</span>
      </div>
      <span className="shrink-0 text-muted-foreground text-xs">
        {statusLabel}
      </span>
    </div>
  );
}

function AgentStreamPlaceholder() {
  return (
    <div
      className="mx-auto flex flex-1 flex-col gap-4 px-4 py-6"
      style={{ maxWidth: MAX_CONTENT_WIDTH }}
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div className="space-y-2" key={i}>
          <div
            className="h-3 animate-pulse rounded bg-muted-foreground/10"
            style={{ width: `${60 + i * 15}%` }}
          />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted-foreground/10" />
        </div>
      ))}
    </div>
  );
}

function SyncOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icons.Loader2 className="size-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Icons.AlertCircle className="size-8 text-destructive/60" />
      <p className="max-w-sm text-muted-foreground text-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outline">
          Retry
        </Button>
      )}
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <Icons.Search className="size-8 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">Agent not found</p>
    </div>
  );
}

export function AgentDetailScreen({
  serverId,
  agentId,
}: {
  serverId: string;
  agentId: string;
}) {
  const session = useSessionStore((s) => s.sessions[serverId]);
  const agent = session?.agents.get(agentId);
  const streamItems = useAgentStreamItems(serverId, agentId);
  const connectionRecord = useDaemonConnectionStatus(serverId);
  const isConnected = connectionRecord?.status === "online";
  const hasTimeline = session?.agentTimelineCursor.has(agentId) ?? false;
  const scrollRef = useRef<HTMLDivElement>(null);

  let missingAgentState: AgentScreenMachineInput["missingAgentState"] = {
    kind: "resolving",
  };
  if (agent) {
    missingAgentState = { kind: "idle" };
  } else if (session?.hasHydratedAgents) {
    missingAgentState = { kind: "not_found", message: "Agent not found" };
  }

  const input: AgentScreenMachineInput = {
    agent: agent ?? null,
    placeholderAgent: null,
    missingAgentState,
    isConnected,
    isArchivingCurrentAgent: false,
    isHistorySyncing: false,
    needsAuthoritativeSync: false,
    shouldUseOptimisticStream: streamItems.length > 0,
    hasHydratedHistoryBefore: hasTimeline,
  };

  const viewState = useAgentScreenStateMachine({
    routeKey: `${serverId}:${agentId}`,
    input,
  });

  useEffect(() => {
    if (agent?.title) {
      document.title = `${agent.title} — OpenBeam`;
    }
    return () => {
      document.title = "OpenBeam";
    };
  }, [agent?.title]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  if (viewState.tag === "not_found") {
    return <NotFoundView />;
  }

  if (viewState.tag === "error") {
    return <ErrorView message={viewState.message} />;
  }

  if (viewState.tag === "boot") {
    return <AgentStreamPlaceholder />;
  }

  if (!agent) {
    return <AgentStreamPlaceholder />;
  }

  const showSyncOverlay =
    viewState.tag === "ready" &&
    viewState.sync.status === "catching_up" &&
    viewState.sync.ui === "overlay";

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <AgentHeader agent={agent} />

      <div
        className="relative flex flex-1 flex-col overflow-y-auto"
        ref={scrollRef}
      >
        {showSyncOverlay && <SyncOverlay message="Syncing history..." />}

        <div
          className="mx-auto flex w-full flex-1 flex-col px-4 py-4"
          style={{ maxWidth: MAX_CONTENT_WIDTH }}
        >
          {streamItems.length > 0 ? (
            <div className="space-y-3">
              {streamItems.map((item) => (
                <StreamItemRenderer item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              No messages yet. Send a prompt to get started.
            </div>
          )}
        </div>
      </div>

      <AgentChatInput agentId={agentId} serverId={serverId} />
    </div>
  );
}

function StreamItemRenderer({ item }: { item: StreamItem }) {
  switch (item.kind) {
    case "user_message":
      return (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          {item.text}
        </div>
      );
    case "assistant_message":
      return <div className="px-1 text-foreground text-sm">{item.text}</div>;
    case "tool_call": {
      const toolName =
        item.payload.source === "agent"
          ? item.payload.data.name
          : item.payload.data.toolName;
      return (
        <div className="flex items-center gap-2 rounded-sm border border-border/30 px-3 py-1.5 text-muted-foreground text-xs">
          <Icons.Settings className="size-3" />
          <span className="font-mono">{toolName}</span>
        </div>
      );
    }
    case "thought":
      return (
        <div className="border-border/40 border-l-2 pl-3 text-muted-foreground text-xs italic">
          {item.text}
        </div>
      );
    case "activity_log":
      return (
        <div className="text-muted-foreground/70 text-xs">{item.message}</div>
      );
    default:
      return null;
  }
}
