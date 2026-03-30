import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { SearchResult } from "./mock-data";
import { SearchView } from "./search-view";
import { SearchSkeleton } from "./skeleton";

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
        const data = toolResult.structuredContent as
          | Record<string, unknown>
          | undefined;
        return (
          <AppShell>
            <SearchView
              query={(data?.query as string) ?? ""}
              results={(data?.results as SearchResult[]) ?? []}
              total={(data?.total as number) ?? 0}
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
