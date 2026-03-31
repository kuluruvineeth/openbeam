import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import { DashboardView } from "./dashboard-view";
import { DashboardSkeleton } from "./skeleton";
import type { Connector } from "./types";

type ToolData = {
  meta?: { cursor?: string; hasNextPage?: boolean };
  data?: Connector[];
};

function App() {
  return (
    <McpAppWrapper
      name="ConnectorDashboard"
      skeleton={
        <AppShell title="Connectors">
          <DashboardSkeleton />
        </AppShell>
      }
    >
      {({ toolResult }) => {
        const sc = toolResult.structuredContent as ToolData | undefined;
        return (
          <AppShell title="Connectors">
            <DashboardView connectors={sc?.data ?? []} />
          </AppShell>
        );
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
