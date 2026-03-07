"use client";

import { Button } from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  useAgentConfigRevisions,
  useControlAgent,
  useRollbackAgentConfig,
} from "../../hooks/use-control-agents";
import { ConfirmDialog } from "../shared/confirm-dialog";

type AgentConfigTabProps = {
  agentId: string;
};

export function AgentConfigTab({ agentId }: AgentConfigTabProps) {
  const { agent } = useControlAgent(agentId);
  const { data: revisions, isLoading } = useAgentConfigRevisions(agentId);
  const rollbackMutation = useRollbackAgentConfig();
  const [rollbackId, setRollbackId] = useState<string | null>(null);

  function handleRollback() {
    if (!rollbackId) {
      return;
    }
    rollbackMutation.mutate(
      { agentId, revisionId: rollbackId },
      { onSuccess: () => setRollbackId(null) }
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium text-sm">Current Config</h3>
        <pre className="rounded-sm border border-border/50 bg-muted/50 p-3 text-xs">
          {JSON.stringify(agent?.runtimeConfig ?? {}, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-sm">Adapter Config</h3>
        <pre className="rounded-sm border border-border/50 bg-muted/50 p-3 text-xs">
          {JSON.stringify(agent?.adapterConfig ?? {}, null, 2)}
        </pre>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-sm">Revision History</h3>
        {isLoading && (
          <p className="text-muted-foreground text-xs">Loading...</p>
        )}
        {!isLoading && (!revisions || revisions.length === 0) && (
          <p className="text-muted-foreground text-xs">No config revisions</p>
        )}
        {!isLoading && revisions && revisions.length > 0 && (
          <div className="space-y-1.5">
            {revisions.map((rev) => (
              <div
                className="flex items-center justify-between rounded-sm border border-border/50 px-3 py-2"
                key={rev.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {rev.changedKeys.join(", ") || "Config change"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {rev.source} &middot;{" "}
                    {formatDistanceToNow(new Date(rev.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Button
                  onClick={() => setRollbackId(rev.id)}
                  size="sm"
                  variant="ghost"
                >
                  Rollback
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Rollback"
        description="This will restore the agent to the selected configuration revision."
        onConfirm={handleRollback}
        onOpenChange={() => setRollbackId(null)}
        open={rollbackId !== null}
        pending={rollbackMutation.isPending}
        title="Rollback Configuration?"
      />
    </div>
  );
}
