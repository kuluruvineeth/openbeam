"use client";

import { Badge, Button, Skeleton } from "@openbeam/ui";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useComputerAgents, useEnableAgent } from "../hooks/use-computer";

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  PAUSED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DRAFT: "bg-muted text-muted-foreground border-border/50",
  ERROR: "bg-destructive/10 text-destructive border-destructive/20",
  ARCHIVED: "bg-muted text-muted-foreground border-border/30",
} as const;

function AgentStatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.DRAFT;
  return (
    <Badge className={style} variant="outline">
      {status.toLowerCase()}
    </Badge>
  );
}

function AgentCard({
  agent,
}: {
  agent: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    mode: string;
    scheduleCron: string | null;
    createdAt: Date;
  };
}) {
  return (
    <Link
      className="flex flex-col gap-2 rounded-md border border-border/50 px-4 py-3 transition-colors hover:border-border hover:bg-muted/30"
      href={`/computer/${agent.id}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{agent.name}</span>
        <AgentStatusBadge status={agent.status} />
      </div>
      {agent.description && (
        <p className="line-clamp-2 text-muted-foreground text-xs">
          {agent.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        {agent.scheduleCron && (
          <span className="flex items-center gap-1">
            <Icons.ClockIcon size={12} />
            {agent.scheduleCron}
          </span>
        )}
        <span>{agent.mode.toLowerCase().replace("_", " ")}</span>
      </div>
    </Link>
  );
}

export function ComputerListView() {
  const { data: agents, isLoading } = useComputerAgents();

  if (isLoading) {
    return <ComputerPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-medium text-xl">Computer</h1>
          <p className="text-muted-foreground text-sm">
            Autonomous agents that work for your team
          </p>
        </div>
        <EnableCatalogButton />
      </div>

      {!agents || agents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard agent={agent} key={agent.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnableCatalogButton() {
  const enableAgent = useEnableAgent();

  return (
    <Button
      disabled={enableAgent.isPending}
      onClick={() => enableAgent.mutate({ templateId: "knowledge-digest" })}
      size="sm"
      variant="outline"
    >
      <Icons.Plus size={14} />
      Enable Agent
    </Button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-border/50 border-dashed py-16">
      <Icons.BotIcon className="text-muted-foreground/40" size={32} />
      <p className="text-muted-foreground text-sm">No agents enabled yet</p>
      <p className="text-muted-foreground/60 text-xs">
        Enable a pre-built agent from the catalog to get started
      </p>
    </div>
  );
}

export function ComputerPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            className="space-y-3 rounded-md border border-border/50 px-4 py-3"
            key={`skeleton-${i.toString()}`}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
