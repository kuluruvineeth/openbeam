"use client";

import { useParams, useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkflowRun = {
  id: string;
  status: "success" | "failed" | "running";
  startedAt: Date;
  completedAt?: Date;
  triggeredBy: string;
};

const MOCK_RUNS: WorkflowRun[] = [
  {
    id: "1",
    status: "success",
    startedAt: new Date(Date.now() - 3_600_000),
    completedAt: new Date(Date.now() - 3_590_000),
    triggeredBy: "Schedule",
  },
  {
    id: "2",
    status: "failed",
    startedAt: new Date(Date.now() - 86_400_000),
    completedAt: new Date(Date.now() - 86_390_000),
    triggeredBy: "Manual",
  },
  {
    id: "3",
    status: "success",
    startedAt: new Date(Date.now() - 172_800_000),
    completedAt: new Date(Date.now() - 172_790_000),
    triggeredBy: "Schedule",
  },
];

function RunRow({ run }: { run: WorkflowRun }) {
  return (
    <div className="flex items-center gap-4 border-border border-b p-4 last:border-b-0">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center",
          run.status === "success" && "bg-green-500/10 text-green-500",
          run.status === "failed" && "bg-red-500/10 text-red-500",
          run.status === "running" && "bg-blue-500/10 text-blue-500"
        )}
      >
        {run.status === "success" && <Icons.CheckIcon size={16} />}
        {run.status === "failed" && <Icons.XIcon size={16} />}
        {run.status === "running" && (
          <Icons.Spinner className="animate-spin" size={16} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-foreground text-sm">{run.id}</span>
          <span
            className={cn(
              "px-2 py-0.5 text-xs capitalize",
              run.status === "success" && "bg-green-500/10 text-green-500",
              run.status === "failed" && "bg-red-500/10 text-red-500",
              run.status === "running" && "bg-blue-500/10 text-blue-500"
            )}
          >
            {run.status}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
          <span>{run.startedAt.toLocaleString()}</span>
          <span>•</span>
          <span>Triggered by {run.triggeredBy}</span>
          {run.completedAt && (
            <>
              <span>•</span>
              <span>
                Duration:{" "}
                {Math.round(
                  (run.completedAt.getTime() - run.startedAt.getTime()) / 1000
                )}
                s
              </span>
            </>
          )}
        </div>
      </div>
      <Button size="sm" variant="ghost">
        Details
      </Button>
    </div>
  );
}

export default function WorkflowRunsPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          onClick={() => router.push(`/workflows/${workflowId}`)}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Workflow Runs</h1>
          <p className="text-muted-foreground text-sm">
            View execution history for this workflow
          </p>
        </div>
      </div>

      {/* Runs List */}
      <div className="border border-border bg-background">
        {MOCK_RUNS.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.History className="mb-4 text-muted-foreground" size={32} />
            <h3 className="mb-2 font-medium text-foreground">No runs yet</h3>
            <p className="text-muted-foreground text-sm">
              This workflow hasn't been executed yet
            </p>
          </div>
        ) : (
          MOCK_RUNS.map((run) => <RunRow key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
