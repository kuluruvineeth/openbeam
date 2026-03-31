import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { SyncJob } from "./mock-data";
import { SyncStatusSkeleton } from "./skeleton";
import { SyncView } from "./sync-view";

type ToolData = {
  meta?: { totalResults?: number };
  data?: SyncJob[];
} & Partial<SyncJob>;

function isSingleJob(sc: ToolData): sc is SyncJob & ToolData {
  return "connectorId" in sc && !("data" in sc);
}

function SyncStatusApp() {
  return (
    <McpAppWrapper
      name="OpenBeam Sync Status"
      skeleton={
        <AppShell title="Sync Status">
          <SyncStatusSkeleton />
        </AppShell>
      }
    >
      {({ toolResult }) => {
        const sc = toolResult.structuredContent as ToolData | undefined;
        let jobs: SyncJob[] = [];
        if (sc?.data) {
          jobs = sc.data;
        } else if (sc && isSingleJob(sc)) {
          jobs = [sc];
        }

        return (
          <AppShell title="Sync Status">
            <SyncView jobs={jobs} />
          </AppShell>
        );
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <SyncStatusApp />
  </StrictMode>
);
