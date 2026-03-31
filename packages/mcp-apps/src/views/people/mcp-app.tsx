import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { Person } from "./mock-data";
import { PeopleView } from "./people-view";
import { PeopleSkeleton } from "./skeleton";

type ToolData = {
  meta?: { totalResults?: number };
  data?: Person[];
};

function PeopleApp() {
  return (
    <McpAppWrapper
      name="OpenBeam People"
      skeleton={
        <AppShell title="People">
          <PeopleSkeleton />
        </AppShell>
      }
    >
      {({ toolResult }) => {
        const sc = toolResult.structuredContent as ToolData | undefined;
        return (
          <AppShell title="People">
            <PeopleView people={sc?.data ?? []} />
          </AppShell>
        );
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <PeopleApp />
  </StrictMode>
);
