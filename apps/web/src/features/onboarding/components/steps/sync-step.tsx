"use client";

import { Button, Progress } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";

type Props = {
  onAdvance: () => void;
  onSkip: () => void;
};

export function SyncStep({ onAdvance, onSkip }: Props) {
  const trpc = useTRPC();
  const [pollEnabled, setPollEnabled] = useState(true);

  const { data: connectors } = useQuery({
    ...trpc.apps.connectors.list.queryOptions(),
    refetchInterval: pollEnabled ? 3000 : false,
  });

  const activeConnectors = (connectors ?? []).filter(
    (c) => c.status === "ACTIVE" || c.status === "SYNCING"
  );
  const hasSynced = activeConnectors.some((c) => c.status === "ACTIVE");
  const isSyncing = activeConnectors.some((c) => c.status === "SYNCING");

  useEffect(() => {
    if (hasSynced) {
      setPollEnabled(false);
    }
  }, [hasSynced]);

  let syncProgress = 10;
  if (hasSynced) {
    syncProgress = 100;
  } else if (isSyncing) {
    syncProgress = 60;
  }

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <h2 className="font-medium text-lg">Syncing your data</h2>
        <p className="text-muted-foreground text-sm">
          {hasSynced && "Your data is ready to search."}
          {!hasSynced &&
            isSyncing &&
            "Importing documents from your connected sources..."}
          {!(hasSynced || isSyncing) &&
            "Waiting for a connector to start syncing..."}
        </p>
      </div>

      <div className="space-y-3">
        <Progress className="h-1" value={syncProgress} />
        {activeConnectors.map((c) => (
          <div
            className="flex items-center gap-3 border border-border/50 px-3 py-2"
            key={c.id}
          >
            <div className="flex size-6 items-center justify-center">
              {c.status === "SYNCING" ? (
                <Icons.Spinner
                  className="animate-spin text-foreground/40"
                  size={14}
                />
              ) : (
                <Icons.Check className="text-foreground/60" size={14} />
              )}
            </div>
            <span className="flex-1 text-sm">{c.name}</span>
            <span className="font-mono text-[10px] text-foreground/40 uppercase">
              {c.status === "ACTIVE" ? "ready" : "syncing"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          disabled={!hasSynced && isSyncing}
          onClick={onAdvance}
          size="sm"
        >
          {hasSynced ? "Continue" : "Skip"}
        </Button>
        {!hasSynced && (
          <button
            className="text-muted-foreground text-xs transition-colors hover:text-foreground"
            onClick={onSkip}
            type="button"
          >
            Skip setup entirely
          </button>
        )}
      </div>
    </div>
  );
}
