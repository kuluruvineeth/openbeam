import "../../globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../../shared/app-shell";
import { McpAppWrapper } from "../../shared/mcp-app-wrapper";
import type { TeamInfo, TeamMember } from "./mock-data";
import { TeamSkeleton } from "./skeleton";
import { TeamView } from "./team-view";

type ToolData = {
  team?: TeamInfo | null;
  members?: TeamMember[];
  data?: TeamInfo | TeamMember[];
};

function hasTeamShape(value: unknown): value is TeamInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "memberCount" in value &&
    "connectorCount" in value
  );
}

function hasMembersShape(value: unknown): value is TeamMember[] {
  return Array.isArray(value) && (value.length === 0 || "email" in value[0]);
}

function extractTeamAndMembers(sc: ToolData | undefined): {
  team: TeamInfo | null;
  members: TeamMember[];
} {
  if (sc?.team || sc?.members) {
    return {
      team: sc.team ?? null,
      members: sc.members ?? [],
    };
  }

  const raw = sc?.data;
  if (hasTeamShape(raw)) {
    return { team: raw, members: [] };
  }
  if (hasMembersShape(raw)) {
    return { team: null, members: raw };
  }

  return { team: null, members: [] };
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
        const { team, members } = extractTeamAndMembers(sc);
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
