import { formatNumber } from "@openbeam/ui/utils/format";
import { EmptyState } from "../../shared/empty-state";
import { SectionHeader } from "../../shared/section-header";
import { StatCard } from "../../shared/stat-card";
import { MemberRow } from "./member-row";
import type { TeamInfo, TeamMember } from "./mock-data";

type TeamViewProps = {
  team: TeamInfo | null;
  members: TeamMember[];
};

export function TeamView({ team, members }: TeamViewProps) {
  if (!team) {
    return (
      <EmptyState
        description="Team information is unavailable."
        icon={
          <svg
            aria-hidden="true"
            className="text-muted-foreground/50"
            fill="none"
            height="24"
            viewBox="0 0 24 24"
            width="24"
          >
            <path
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        }
        title="No team data"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Members" value={team.memberCount} />
        <StatCard label="Sources" value={team.connectorCount} />
        <StatCard label="Documents" value={formatNumber(team.documentCount)} />
      </div>

      <div>
        <SectionHeader count={members.length} title="Members" />
        {members.length === 0 ? (
          <EmptyState title="No members" />
        ) : (
          <div className="divide-y divide-border/50 rounded-sm border border-border/50">
            {members.map((member) => (
              <MemberRow key={member.id} {...member} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
