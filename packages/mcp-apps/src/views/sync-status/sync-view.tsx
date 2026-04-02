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
              d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        }
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
