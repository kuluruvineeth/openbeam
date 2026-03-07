"use client";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type Workspace = {
  id: string;
  name: string;
  cwd: string | null;
  repoUrl: string | null;
  repoRef: string | null;
  isPrimary: boolean;
};

type WorkspaceListProps = {
  workspaces: Workspace[];
  className?: string;
};

export function WorkspaceList({ workspaces, className }: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No workspaces configured</p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {workspaces.map((ws) => (
        <div
          className="flex items-start gap-2 rounded-sm border border-border/50 px-3 py-2"
          key={ws.id}
        >
          <Icons.Folder
            className="mt-0.5 shrink-0 text-muted-foreground"
            size={14}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-sm">{ws.name}</span>
              {ws.isPrimary && (
                <span className="rounded-sm bg-blue-500/10 px-1 py-px font-medium text-[10px] text-blue-600">
                  Primary
                </span>
              )}
            </div>
            {ws.repoUrl && (
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                {ws.repoUrl}
                {ws.repoRef ? ` (${ws.repoRef})` : ""}
              </p>
            )}
            {ws.cwd && (
              <p className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
                {ws.cwd}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
