"use client";

import { Progress } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { getUserFriendlyError } from "@/lib/error-messages";
import {
  formatTimeRemaining,
  getJobLabel,
  getJobStatusConfig,
  type JobProgress,
} from "@/lib/job-status";
import { getPhaseMessage } from "@/lib/phase-messages";
import { cn } from "@/lib/utils";
import { useJobStore } from "@/stores/job-store";

type JobProgressItemProps = {
  job: JobProgress;
};

export function JobProgressItem({ job }: JobProgressItemProps) {
  const dismissJob = useJobStore((s) => s.dismissJob);
  const config = getJobStatusConfig(job.status);
  const StatusIcon = config.icon;
  const label = getJobLabel(job.type, job.connectorName ?? job.fileName);
  const phaseMessage = getPhaseMessage(
    job.type,
    job.currentPhase,
    job.connectorName
  );
  const friendlyError = job.error
    ? getUserFriendlyError(job.error, job.connectorName)
    : null;

  return (
    <div className="space-y-2 border-border/40 border-b px-3 py-2.5 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StatusIcon className={cn("shrink-0", config.iconClass)} size={14} />
          <span className="truncate font-medium text-sm">{label}</span>
        </div>
        <button
          className="shrink-0 text-foreground/40 hover:text-foreground/60"
          onClick={() => dismissJob(job.id)}
          type="button"
        >
          <Icons.Close size={12} />
        </button>
      </div>

      {job.status === "running" && (
        <>
          <div className="flex items-center gap-2">
            <Progress className="h-1 flex-1" value={job.progress} />
            <span className="font-mono text-[10px] text-foreground/50 tabular-nums">
              {job.progress}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-foreground/40">
            <span>
              {phaseMessage ? (
                <>
                  {phaseMessage.text}
                  {phaseMessage.useEllipsis && (
                    <span className="inline-flex">
                      <span className="ml-px animate-[ellipsis_1.5s_infinite]">
                        .
                      </span>
                      <span className="ml-px animate-[ellipsis_1.5s_infinite_0.2s]">
                        .
                      </span>
                      <span className="ml-px animate-[ellipsis_1.5s_infinite_0.4s]">
                        .
                      </span>
                    </span>
                  )}
                </>
              ) : (
                (job.currentPhase ?? "Processing")
              )}
              {job.itemsProcessed > 0 && (
                <span className="ml-1 font-mono tabular-nums">
                  • {job.itemsProcessed.toLocaleString()}{" "}
                  {job.type === "sync" ? "fetched" : "processed"}
                </span>
              )}
            </span>
            {job.estimatedTimeRemainingMs && (
              <span className="font-mono tabular-nums">
                {formatTimeRemaining(job.estimatedTimeRemainingMs)}
              </span>
            )}
          </div>
        </>
      )}

      {job.status === "completed" && (
        <p className="text-[10px] text-openbeam-green">
          <span className="font-mono tabular-nums">
            {job.itemsProcessed.toLocaleString()}
          </span>{" "}
          items {job.type === "sync" ? "synced" : "processed"}
        </p>
      )}

      {job.status === "failed" && friendlyError && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-[11px] text-destructive">
              {friendlyError.title}
            </p>
            {friendlyError.action && (
              <span className="shrink-0 text-[10px] text-foreground/50">
                {friendlyError.action}
              </span>
            )}
          </div>
          <p className="text-[10px] text-foreground/60 leading-relaxed">
            {friendlyError.message}
          </p>
        </div>
      )}
    </div>
  );
}
