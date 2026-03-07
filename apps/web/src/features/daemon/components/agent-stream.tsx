"use client";

import { cn } from "@openbeam/ui";
import { useMemo } from "react";
import { useAgentStreamItems } from "../hooks/use-agent-snapshot";
import { useAgentTimeline } from "../hooks/use-agent-timeline";
import { useSessionStore } from "../stores/session-store";
import { AgentTimeline } from "./agent-timeline";
import { PermissionCard } from "./permission-dialog";

export interface AgentStreamProps {
  serverId: string;
  agentId: string;
  className?: string;
}

export function AgentStream({
  serverId,
  agentId,
  className,
}: AgentStreamProps) {
  const agent = useSessionStore(
    (s) => s.sessions[serverId]?.agents.get(agentId) ?? null
  );
  const streamItems = useAgentStreamItems(serverId, agentId);
  const timeline = useAgentTimeline(serverId, agentId);
  const session = useSessionStore((s) => s.sessions[serverId]);

  const pendingPermissions = useMemo(() => {
    if (!session?.pendingPermissions) {
      return [];
    }
    return Array.from(session.pendingPermissions.values()).filter(
      (p) => p.agentId === agentId
    );
  }, [session?.pendingPermissions, agentId]);

  const isRunning = agent?.status === "running";

  return (
    <div
      className={cn("relative flex flex-1 flex-col overflow-hidden", className)}
    >
      <AgentTimeline
        className="flex-1"
        cwd={agent?.cwd}
        hasOlderItems={timeline.hasOlderItems}
        isLoadingOlder={false}
        isRunning={isRunning}
        items={streamItems}
      />

      {pendingPermissions.length > 0 && (
        <div className="border-border/30 border-t bg-background px-4 py-3">
          <div className="mx-auto max-w-[820px] space-y-2">
            {pendingPermissions.map((perm) => (
              <PermissionCard
                key={perm.key}
                permission={perm}
                serverId={serverId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
