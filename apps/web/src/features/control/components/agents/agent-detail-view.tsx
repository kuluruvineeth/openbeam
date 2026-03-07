"use client";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@openbeam/ui";
import Link from "next/link";
import { useState } from "react";
import { Icons } from "@/components/icons";
import {
  useControlAgent,
  usePauseAgent,
  useResumeAgent,
  useTerminateAgent,
} from "../../hooks/use-control-agents";
import { AgentIdentity } from "../shared/agent-avatar";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { StatusBadge } from "../shared/status-badge";
import { AgentConfigTab } from "./agent-config-tab";
import { AgentDetailSkeleton } from "./agent-detail-skeleton";
import { AgentKeysTab } from "./agent-keys-tab";
import { AgentOverviewTab } from "./agent-overview-tab";
import { AgentRunsTab } from "./agent-runs-tab";

type AgentDetailViewProps = {
  agentId: string;
};

export function AgentDetailView({ agentId }: AgentDetailViewProps) {
  const { agent, isLoading } = useControlAgent(agentId);
  const pauseMutation = usePauseAgent();
  const resumeMutation = useResumeAgent();
  const terminateMutation = useTerminateAgent();
  const [confirmAction, setConfirmAction] = useState<
    "pause" | "terminate" | null
  >(null);

  if (isLoading || !agent) {
    return <AgentDetailSkeleton />;
  }

  const canPause =
    agent.status === "ACTIVE" ||
    agent.status === "RUNNING" ||
    agent.status === "IDLE";
  const canResume = agent.status === "PAUSED";
  const canTerminate = agent.status !== "TERMINATED";

  function handleConfirm() {
    if (confirmAction === "pause") {
      pauseMutation.mutate({ agentId });
    } else if (confirmAction === "terminate") {
      terminateMutation.mutate({ agentId });
    }
    setConfirmAction(null);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            className="text-muted-foreground transition-colors hover:text-foreground"
            href="/control/agents"
          >
            <Icons.ArrowLeft size={16} />
          </Link>
          <AgentIdentity
            name={agent.name}
            size="lg"
            status={agent.status}
            title={agent.title}
          />
          <StatusBadge domain="agent" status={agent.status} />
        </div>

        <div className="flex items-center gap-2">
          {canResume && (
            <Button
              disabled={resumeMutation.isPending}
              onClick={() => resumeMutation.mutate({ agentId })}
              size="sm"
              variant="outline"
            >
              <Icons.Play size={14} />
              Resume
            </Button>
          )}
          {canPause && (
            <Button
              onClick={() => setConfirmAction("pause")}
              size="sm"
              variant="outline"
            >
              <Icons.Pause size={14} />
              Pause
            </Button>
          )}
          {canTerminate && (
            <Button
              onClick={() => setConfirmAction("terminate")}
              size="sm"
              variant="outline"
            >
              Terminate
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value="overview">
          <AgentOverviewTab agent={agent} agentId={agentId} />
        </TabsContent>
        <TabsContent className="mt-4" value="runs">
          <AgentRunsTab agentId={agentId} />
        </TabsContent>
        <TabsContent className="mt-4" value="config">
          <AgentConfigTab agentId={agentId} />
        </TabsContent>
        <TabsContent className="mt-4" value="keys">
          <AgentKeysTab agentId={agentId} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        confirmLabel={confirmAction === "terminate" ? "Terminate" : "Pause"}
        description={
          confirmAction === "terminate"
            ? "This will permanently stop the agent. Active runs will be cancelled."
            : "The agent will stop processing new work until resumed."
        }
        destructive={confirmAction === "terminate"}
        onConfirm={handleConfirm}
        onOpenChange={() => setConfirmAction(null)}
        open={confirmAction !== null}
        pending={pauseMutation.isPending || terminateMutation.isPending}
        title={`${confirmAction === "terminate" ? "Terminate" : "Pause"} ${agent.name}?`}
      />
    </div>
  );
}
