import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { TeamInfo, TeamMember } from "./mock-data";
import { TeamSkeleton } from "./skeleton";
import { TeamView } from "./team-view";

type ToolData = {
  data?: TeamInfo | TeamMember[];
};

function isTeamInfo(data: unknown): data is TeamInfo {
  return (
    typeof data === "object" &&
    data !== null &&
    "memberCount" in data &&
    "connectorCount" in data
  );
}

function isTeamMembers(data: unknown): data is TeamMember[] {
  return Array.isArray(data) && data.length > 0 && "email" in data[0];
}

function TeamApp() {
  return (
    <McpAppWrapper
      name="OpenBeam Team"
      skeleton={
        <AppShell title="Team">
          <TeamSkeleton />
        </AppShell>
      }
    >
      {({ toolResult }) => {
        const sc = toolResult.structuredContent as ToolData | undefined;
        const raw = sc?.data;

        let team: TeamInfo | null = null;
        let members: TeamMember[] = [];

        if (isTeamInfo(raw)) {
          team = raw;
        } else if (isTeamMembers(raw)) {
          members = raw;
        }

        const title = team?.name ?? "Team";

        return (
          <AppShell title={title}>
            <TeamView members={members} team={team} />
          </AppShell>
        );
      }}
    </McpAppWrapper>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <TeamApp />
  </StrictMode>
);
