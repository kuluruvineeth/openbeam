import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { Connector } from "./connector-row";
import { DashboardView } from "./dashboard-view";
import { DashboardSkeleton } from "./skeleton";

function parseConnectors(toolResult: {
  content: Array<{ type: string; text?: string }>;
}): Connector[] {
  const first = toolResult.content[0];
  if (!(first && "text" in first) || typeof first.text !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(first.text);
    return parsed?.data ?? [];
  } catch {
    return [];
  }
}

function App() {
  return (
    <McpAppWrapper name="ConnectorDashboard" skeleton={<DashboardSkeleton />}>
      {({ toolResult }) => {
        const connectors = parseConnectors(
          toolResult as { content: Array<{ type: string; text?: string }> }
        );
        return <DashboardView connectors={connectors} />;
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
