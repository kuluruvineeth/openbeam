import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { Connector } from "./connector-row";
import { DashboardView } from "./dashboard-view";
import { DashboardSkeleton } from "./skeleton";

interface ToolStructuredContent {
  meta?: { cursor?: string; hasNextPage?: boolean };
  data?: Connector[];
}

function App() {
  return (
    <McpAppWrapper
      name="ConnectorDashboard"
      skeleton={
        <AppShell>
          <DashboardSkeleton />
        </AppShell>
      }
    >
      {({ toolResult }) => {
        const sc = toolResult.structuredContent as
          | ToolStructuredContent
          | undefined;
        return (
          <AppShell>
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
