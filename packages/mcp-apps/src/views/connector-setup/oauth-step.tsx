import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { OAuthLoading } from "@openbeam/ui/components/oauth-loading";
import { useEffect, useRef, useState } from "react";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { PollStatus, SetupData } from "./types";

type OAuthState = "initial" | "connecting" | "processing" | "success" | "error";

const OAUTH_STATE_MAP: Record<
  OAuthState,
  "connecting" | "processing" | "success" | "error"
> = {
  initial: "connecting",
  connecting: "connecting",
  processing: "processing",
  success: "success",
  error: "error",
};

function mapOAuthState(
  state: OAuthState
): "connecting" | "processing" | "success" | "error" {
  return OAUTH_STATE_MAP[state];
}

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
  const [oauthState, setOAuthState] = useState<OAuthState>("initial");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleOpenAuth = async () => {
    if (!setupData.oauthUrl) {
      return;
    }
    setOAuthState("connecting");
    try {
      await app.openLink({ url: setupData.oauthUrl });
      setOAuthState("processing");
    } catch {
      setOAuthState("processing");
    }
  };

  useEffect(() => {
    if (oauthState !== "processing" || !setupData.setupId) {
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

        if (s === "completed" && sc?.connectorId) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setOAuthState("success");
          setTimeout(() => onComplete(sc.connectorId as string), 1000);
        }

        if (s === "failed" || s === "expired") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setOAuthState("error");
          setErrorMsg(sc?.error ?? `Setup ${s}`);
          setTimeout(() => onError(sc?.error ?? `Setup ${s}`), 2000);
        }
      } catch {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setOAuthState("error");
        setErrorMsg("Connection check failed");
      }
    };

    intervalRef.current = setInterval(poll, 3000);
    poll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [oauthState, setupData.setupId, app, onComplete, onError]);

  const appName = setupData.app?.name ?? "connector";
  const appId = setupData.app?.id ?? "";

  if (oauthState !== "initial") {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <ConnectorLogo size={32} type={appId} />
        <OAuthLoading
          integration={appName}
          message={errorMsg ?? undefined}
          state={mapOAuthState(oauthState)}
        />
        {oauthState === "processing" && setupData.oauthUrl && (
          <button
            className="text-[10px] text-foreground/30 underline"
            onClick={() =>
              navigator.clipboard.writeText(setupData.oauthUrl ?? "")
            }
            type="button"
          >
            Copy authorization URL
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <ConnectorLogo size={40} type={appId} />

      <div className="space-y-1">
        <p className="font-medium text-sm">Connect {appName}</p>
        <p className="max-w-xs text-muted-foreground text-xs">
          Authorize OpenBeam to access your {appName} data. You&apos;ll be
          redirected to {appName} to grant access.
        </p>
      </div>

      <button
        className="rounded-sm bg-foreground px-4 py-2 font-medium text-background text-xs transition-colors hover:bg-foreground/90"
        onClick={handleOpenAuth}
        type="button"
      >
        Authorize {appName}
      </button>

      <p className="text-[10px] text-foreground/30">
        Data encrypted in transit · Revoke access anytime
      </p>
    </div>
  );
}
