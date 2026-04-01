import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useState } from "react";
import { ConnectorLogo } from "../../shared/connector-logo";

type SuccessStepProps = {
  app: McpApp;
  connectorId: string;
  appName: string;
  appId: string;
};

export function SuccessStep({
  app,
  connectorId,
  appName,
  appId,
}: SuccessStepProps) {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await app.callServerTool({
        name: "sync_trigger",
        arguments: { connectorId, type: "full" },
      });
      setSynced(true);
    } catch {
      setSynced(false);
    }
    setSyncing(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
        <ConnectorLogo size={24} type={appId} />
      </div>

      <div className="space-y-1">
        <p className="font-medium text-emerald-600 text-sm">
          {appName} connected
        </p>
        <p className="text-muted-foreground text-xs">
          {synced
            ? "Sync started. Documents will appear in search shortly."
            : "Start syncing to index your data."}
        </p>
      </div>

      {!synced && (
        <button
          className="rounded-sm border border-border/50 px-4 py-2 font-medium text-xs transition-colors hover:bg-muted/50 disabled:opacity-50"
          disabled={syncing}
          onClick={handleSync}
          type="button"
        >
          {syncing ? "Starting sync..." : "Start Syncing"}
        </button>
      )}

      {synced && (
        <span className="text-[10px] text-foreground/40">
          Connector ID: {connectorId}
        </span>
      )}
    </div>
  );
}
