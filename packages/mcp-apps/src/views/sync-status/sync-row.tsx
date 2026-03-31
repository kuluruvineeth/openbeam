import { StatusBadge } from "@openbeam/ui/components/status-badge";
import { formatNumber, formatRelativeTime } from "@openbeam/ui/utils/format";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { SyncJob } from "./mock-data";

type SyncRowProps = {
  job: SyncJob;
};

export function SyncRow({ job }: SyncRowProps) {
  const progress = job.progress ?? 0;
  const hasDocCounts =
    job.processedDocs != null && job.totalDocs != null && job.totalDocs > 0;

  return (
    <div className="flex flex-col gap-2 border-border/50 border-b p-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <ConnectorLogo size={20} type={job.connectorType} />
          <span className="truncate font-medium text-sm">
            {job.connectorName}
          </span>
        </div>
        <StatusBadge status={job.status} type="connector" />
      </div>

      {job.status === "SYNCING" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        {hasDocCounts && (
          <span className="tabular-nums">
            {formatNumber(job.processedDocs ?? 0)} /{" "}
            {formatNumber(job.totalDocs ?? 0)} docs
          </span>
        )}
        {job.startedAt && (
          <span>Started {formatRelativeTime(job.startedAt)}</span>
        )}
        {job.completedAt && (
          <span>Completed {formatRelativeTime(job.completedAt)}</span>
        )}
      </div>

      {job.error && (
        <span className="text-destructive text-xs">{job.error}</span>
      )}
    </div>
  );
}
