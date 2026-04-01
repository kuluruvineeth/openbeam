import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { Bone } from "../../shared/loading-skeleton";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import { ConnectorSetupView } from "./connector-setup-view";
import type { AvailableConnector, SetupData } from "./types";

type ToolData = {
  meta?: { totalResults?: number };
  data?: AvailableConnector[];
  setupId?: string;
  connectorId?: string;
  oauthUrl?: string;
  app?: { id: string; name: string };
  expiresAt?: string;
};

function SetupSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Bone className="h-9 w-full" />
      <Bone className="h-12 w-full" />
      <Bone className="h-12 w-full" />
      <Bone className="h-12 w-full" />
      <Bone className="h-12 w-full" />
    </div>
  );
}

function ConnectorSetupApp() {
  return (
    <McpAppWrapper
      name="ConnectorSetup"
      skeleton={
        <AppShell title="Connect">
          <SetupSkeleton />
        </AppShell>
      }
    >
      {({ toolResult, app }) => {
        const sc = toolResult.structuredContent as ToolData | undefined;

        const connectors: AvailableConnector[] = sc?.data ?? [];
        const setupData: SetupData | undefined = sc?.oauthUrl
          ? {
              setupId: sc.setupId,
              connectorId: sc.connectorId,
              oauthUrl: sc.oauthUrl,
              app: sc.app,
              expiresAt: sc.expiresAt,
            }
          : undefined;

        return (
          <AppShell title="Connect">
            <ConnectorSetupView
              app={app}
              connectors={connectors}
              initialSetupData={setupData}
            />
          </AppShell>
        );
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ConnectorSetupApp />
  </StrictMode>
);
