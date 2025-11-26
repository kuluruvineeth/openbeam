"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Workflow = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  lastRunAt?: Date;
  runCount: number;
  trigger: string;
};

const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: "1",
    name: "Weekly Report Generator",
    description: "Generates a weekly summary report from all data sources",
    isActive: true,
    lastRunAt: new Date(Date.now() - 86_400_000),
    runCount: 24,
    trigger: "Schedule (Weekly)",
  },
  {
    id: "2",
    name: "New Document Notifier",
    description: "Sends Slack notification when new docs are indexed",
    isActive: true,
    lastRunAt: new Date(Date.now() - 3_600_000),
    runCount: 156,
    trigger: "Event (Document Created)",
  },
  {
    id: "3",
    name: "Stale Content Cleanup",
    description: "Archives documents not accessed in 90 days",
    isActive: false,
    runCount: 0,
    trigger: "Schedule (Monthly)",
  },
];

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  return (
    <Link
      className="group flex items-center justify-between border border-border bg-background p-4 transition-colors hover:border-primary/50"
      href={`/workflows/${workflow.id}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center",
            workflow.isActive
              ? "bg-green-500/10 text-green-500"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icons.Workflow size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground group-hover:text-primary">
              {workflow.name}
            </h3>
            <span
              className={cn(
                "px-2 py-0.5 text-xs",
                workflow.isActive
                  ? "bg-green-500/10 text-green-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {workflow.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {workflow.description && (
            <p className="text-muted-foreground text-sm">
              {workflow.description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
            <span>{workflow.trigger}</span>
            <span>•</span>
            <span>{workflow.runCount} runs</span>
            {workflow.lastRunAt && (
              <>
                <span>•</span>
                <span>Last run {workflow.lastRunAt.toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Icons.ArrowRight
        className="text-muted-foreground group-hover:text-primary"
        size={18}
      />
    </Link>
  );
}

export default function WorkflowsPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Workflows</h1>
          <p className="text-muted-foreground text-sm">
            Automate tasks with custom workflows
          </p>
        </div>
        <Button onClick={() => router.push("/workflows/new")}>
          <Icons.Plus className="mr-2" size={16} />
          New Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="space-y-3">
        {MOCK_WORKFLOWS.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-border border-dashed py-16 text-center">
            <Icons.Workflow className="mb-4 text-muted-foreground" size={32} />
            <h3 className="mb-2 font-medium text-foreground">No workflows</h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Create your first workflow to automate repetitive tasks
            </p>
            <Button onClick={() => router.push("/workflows/new")}>
              Create Workflow
            </Button>
          </div>
        ) : (
          MOCK_WORKFLOWS.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))
        )}
      </div>
    </div>
  );
}
