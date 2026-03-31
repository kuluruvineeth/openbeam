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
