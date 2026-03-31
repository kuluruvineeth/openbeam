import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { SearchResult } from "./mock-data";
import { SearchView } from "./search-view";
import { SearchSkeleton } from "./skeleton";

interface ToolStructuredContent {
  meta?: { query?: string; totalResults?: number };
  data?: SearchResult[];
}

function SearchApp() {
  return (
    <McpAppWrapper
      name="OpenBeam Search"
      skeleton={
        <AppShell>
          <SearchSkeleton />
        </AppShell>
      }
    >
      {({ toolResult }) => {
        const sc = toolResult.structuredContent as
          | ToolStructuredContent
          | undefined;
        return (
          <AppShell>
            <SearchView
              query={sc?.meta?.query ?? ""}
              results={sc?.data ?? []}
              total={sc?.meta?.totalResults ?? 0}
            />
          </AppShell>
        );
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <SearchApp />
  </StrictMode>
);
