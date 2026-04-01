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
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
          <ConnectorLogo size={32} type={appId} />
        </div>
        <div className="-right-0.5 -bottom-0.5 absolute flex size-5 items-center justify-center rounded-full bg-emerald-500">
          <svg
            aria-hidden="true"
            className="text-white"
            fill="none"
            height="12"
            viewBox="0 0 16 16"
            width="12"
          >
            <path
              d="M3 8.5l3.5 3.5L13 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-semibold text-sm">{appName} connected</p>
        <p className="max-w-xs text-muted-foreground text-xs">
          {synced
            ? "Sync started. Your documents will appear in search shortly."
            : "Start syncing to index your data and make it searchable."}
        </p>
      </div>

      {!synced && (
        <button
          className="rounded-sm bg-foreground px-5 py-2.5 font-medium text-background text-xs transition-colors hover:bg-foreground/90 disabled:opacity-50"
          disabled={syncing}
          onClick={handleSync}
          type="button"
        >
          {syncing ? "Starting..." : "Start Syncing"}
        </button>
      )}

      {synced && (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-emerald-600 text-xs">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Syncing in progress
          </span>
          <span className="text-[10px] text-foreground/30">
            ID: {connectorId}
          </span>
        </div>
      )}

      <p className="text-[10px] text-foreground/30">
        Data encrypted in transit · Revoke access anytime
      </p>
    </div>
  );
}
