"use client";

import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type ActivityEntry = {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  agentId?: string | null;
  runId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string | Date;
};

type ActivityRowProps = {
  entry: ActivityEntry;
};

const ACTOR_ICONS: Record<string, typeof Icons.User> = {
  USER: Icons.User,
  user: Icons.User,
  AGENT: Icons.BotIcon,
  agent: Icons.BotIcon,
  SYSTEM: Icons.Settings,
  system: Icons.Settings,
};

const ENTITY_COLORS: Record<string, string> = {
  AGENT: "text-blue-600",
  ISSUE: "text-violet-600",
  PROJECT: "text-emerald-600",
  GOAL: "text-amber-600",
  APPROVAL: "text-orange-600",
  SECRET: "text-red-600",
  MEMBERSHIP: "text-zinc-600",
};

function actorLabel(entry: ActivityEntry): string {
  const normalized = entry.actorType.toUpperCase();
  if (normalized === "SYSTEM") {
    return "System";
  }
  if (normalized === "AGENT") {
    return entry.agentId ?? entry.actorId ?? "Agent";
  }
  return entry.actorId ?? "User";
}

export function ActivityRow({ entry }: ActivityRowProps) {
  const ActorIcon = ACTOR_ICONS[entry.actorType] ?? Icons.User;
  const entityColor =
    ENTITY_COLORS[entry.entityType] ?? "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 border-border/50 border-b px-3 py-2.5 last:border-b-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <ActorIcon size={13} />
      </div>

      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 text-xs">
        <span className="font-medium text-foreground">{actorLabel(entry)}</span>
        <span className="text-muted-foreground">{entry.action}</span>
        <span className={cn("font-medium lowercase", entityColor)}>
          {entry.entityType}
        </span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {entry.entityId.slice(0, 8)}
        </span>
      </div>

      <span className="shrink-0 text-[11px] text-muted-foreground">
        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}
