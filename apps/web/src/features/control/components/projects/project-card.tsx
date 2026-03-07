"use client";

import type { ControlProjectStatus } from "@openbeam/types/control";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../shared/status-badge";

type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    status: ControlProjectStatus;
    leadAgentId: string | null;
    targetDate: Date | null;
    color: string | null;
    createdAt: Date;
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      className={cn(
        "group block rounded-sm border border-border/50 p-4 transition-colors",
        "hover:border-border hover:bg-muted/30"
      )}
      href={`/control/projects/${project.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {project.color && (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          )}
          <h3 className="truncate font-medium text-sm">{project.name}</h3>
        </div>
        <StatusBadge domain="project" size="sm" status={project.status} />
      </div>

      <div className="mt-3 flex items-center gap-3 text-muted-foreground text-xs">
        {project.targetDate && (
          <span className="flex items-center gap-1">
            <Icons.Calendar size={12} />
            {formatDistanceToNow(new Date(project.targetDate), {
              addSuffix: true,
            })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Icons.Clock size={12} />
          {formatDistanceToNow(new Date(project.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </Link>
  );
}
