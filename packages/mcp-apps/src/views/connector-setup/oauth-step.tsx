import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useEffect, useRef, useState } from "react";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { PollStatus, SetupData } from "./types";

type OAuthStepProps = {
  app: McpApp;
  setupData: SetupData;
  onComplete: (connectorId: string) => void;
  onError: (message: string) => void;
};

export function OAuthStep({
  app,
  setupData,
  onComplete,
  onError,
}: OAuthStepProps) {
  const [status, setStatus] = useState<PollStatus>("pending");
  const [opened, setOpened] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleOpenAuth = async () => {
    if (!setupData.oauthUrl) {
      return;
    }
    try {
      await app.openLink({ url: setupData.oauthUrl });
      setOpened(true);
    } catch {
      setOpened(true);
    }
  };

  useEffect(() => {
    if (!(opened && setupData.setupId)) {
      return;
    }

    const poll = async () => {
      try {
        const result = await app.callServerTool({
          name: "connector_setup_status",
          arguments: { setupId: setupData.setupId },
        });

        const sc = result.structuredContent as
          | {
              status?: string;
              connectorId?: string;
              error?: string;
            }
          | undefined;

        const s = (sc?.status ?? "pending") as PollStatus;
        setStatus(s);

        if (s === "completed" && sc?.connectorId) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          onComplete(sc.connectorId);
        }

        if (s === "failed" || s === "expired") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          onError(sc?.error ?? `Setup ${s}`);
        }
      } catch {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onError("Polling failed");
      }
    };

    intervalRef.current = setInterval(poll, 3000);
    poll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [opened, setupData.setupId, app, onComplete, onError]);

  const appName = setupData.app?.name ?? "connector";
  const appId = setupData.app?.id ?? "";

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <ConnectorLogo size={40} type={appId} />

      <div className="space-y-1">
        <p className="font-medium text-sm">Connect {appName}</p>
        <p className="max-w-xs text-muted-foreground text-xs">
          {opened
            ? "Complete authorization in your browser. This page will update automatically."
            : `Click below to authorize OpenBeam to access your ${appName} data.`}
        </p>
      </div>

      {!opened && (
        <button
          className="rounded-sm border border-border/50 bg-foreground px-4 py-2 font-medium text-background text-xs transition-colors hover:bg-foreground/90"
          onClick={handleOpenAuth}
          type="button"
        >
          Authorize {appName}
        </button>
      )}

      {opened && status === "pending" && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="size-1.5 animate-pulse rounded-full bg-foreground/40" />
          Waiting for authorization...
        </div>
      )}

      {setupData.oauthUrl && (
        <p className="text-[10px] text-foreground/30">
          {opened ? "Or copy the URL:" : ""}
          {opened && (
            <button
              className="ml-1 underline"
              onClick={() =>
                navigator.clipboard.writeText(setupData.oauthUrl ?? "")
              }
              type="button"
            >
              Copy link
            </button>
          )}
        </p>
      )}
    </div>
  );
}
