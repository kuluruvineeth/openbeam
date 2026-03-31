import { EmptyState } from "../../shared/empty-state";
import { SectionHeader } from "../../shared/section-header";
import type { SyncJob } from "./mock-data";
import { SyncRow } from "./sync-row";

type SyncViewProps = {
  jobs: SyncJob[];
};

export function SyncView({ jobs }: SyncViewProps) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        description="No sync jobs are currently running or recently completed."
        title="No sync activity"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader count={jobs.length} title="Sync Jobs" />
      <div className="flex flex-col rounded-sm border border-border/50">
        {jobs.map((job) => (
          <SyncRow job={job} key={job.connectorId} />
        ))}
      </div>
    </div>
  );
}
