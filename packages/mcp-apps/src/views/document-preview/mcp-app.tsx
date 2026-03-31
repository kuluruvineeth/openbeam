import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { DocumentRecord } from "./mock-data";
import { PreviewView } from "./preview-view";
import { PreviewSkeleton } from "./skeleton";

type ToolData = {
  data?: DocumentRecord;
  document?: DocumentRecord;
};

function App() {
  return (
    <McpAppWrapper
      name="DocumentPreview"
      skeleton={
        <AppShell title="Document">
          <PreviewSkeleton />
        </AppShell>
      }
    >
      {({ toolResult }) => {
        const sc = toolResult.structuredContent as ToolData | undefined;
        const doc = sc?.data ?? sc?.document ?? null;
        return (
          <AppShell title="Document">
            <PreviewView document={doc} />
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
