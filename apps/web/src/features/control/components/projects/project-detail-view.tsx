"use client";

import { Button, Separator } from "@openbeam/ui";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useControlIssues } from "../../hooks/use-control-issues";
import {
  useArchiveProject,
  useControlProject,
} from "../../hooks/use-control-projects";
import { AgentIdentity } from "../shared/agent-avatar";
import { EmptyState } from "../shared/empty-state";
import { PropertiesPanel } from "../shared/properties-panel";
import { StatusBadge } from "../shared/status-badge";
import { WorkspaceList } from "./workspace-list";

type ProjectDetailViewProps = {
  projectId: string;
};

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const { data: project } = useControlProject(projectId);
  const { issues: projectIssues } = useControlIssues({ projectId });
  const archiveMutation = useArchiveProject();

  if (!project) {
    return (
      <EmptyState icon={<Icons.Folder size={32} />} title="Project not found" />
    );
  }

  const properties = [
    {
      label: "Status",
      value: <StatusBadge domain="project" status={project.status} />,
    },
    {
      label: "Lead Agent",
      value: project.leadAgent ? (
        <AgentIdentity name={project.leadAgent.name} size="sm" />
      ) : (
        <span className="text-muted-foreground text-xs">Unassigned</span>
      ),
    },
    {
      label: "Target Date",
      value: project.targetDate ? (
        <span className="text-sm">
          {format(new Date(project.targetDate), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">No target date</span>
      ),
    },
    {
      label: "Created",
      value: (
        <span className="text-sm">
          {formatDistanceToNow(new Date(project.createdAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      label: "Updated",
      value: (
        <span className="text-sm">
          {formatDistanceToNow(new Date(project.updatedAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
  ];

  const linkedGoals = project.goalLinks ?? [];

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            className="text-muted-foreground transition-colors hover:text-foreground"
            href="/control/projects"
          >
            <Icons.ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            {project.color && (
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
            )}
            <h1 className="font-semibold text-lg">{project.name}</h1>
          </div>
          <StatusBadge domain="project" status={project.status} />
        </div>
        <Button
          disabled={archiveMutation.isPending}
          onClick={() => archiveMutation.mutate({ projectId })}
          size="sm"
          variant="ghost"
        >
          <Icons.Archive size={14} />
          Archive
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {project.description && (
            <p className="text-muted-foreground text-sm">
              {project.description}
            </p>
          )}

          <div>
            <h2 className="mb-2 font-medium text-sm">Workspaces</h2>
            <WorkspaceList workspaces={project.workspaces ?? []} />
          </div>

          <Separator />

          <div>
            <h2 className="mb-2 font-medium text-sm">Linked Goals</h2>
            {linkedGoals.length === 0 ? (
              <p className="text-muted-foreground text-xs">No goals linked</p>
            ) : (
              <div className="space-y-1.5">
                {linkedGoals.map(
                  (link: {
                    id: string;
                    goal: { title: string; status: string };
                  }) => (
                    <div
                      className="flex items-center gap-2 rounded-sm border border-border/50 px-3 py-2"
                      key={link.id}
                    >
                      <Icons.Target
                        className="shrink-0 text-muted-foreground"
                        size={14}
                      />
                      <span className="truncate text-sm">
                        {link.goal.title}
                      </span>
                      <StatusBadge
                        domain="goal"
                        size="sm"
                        status={link.goal.status}
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h2 className="mb-2 font-medium text-sm">Issues</h2>
            {projectIssues.length === 0 ? (
              <p className="text-muted-foreground text-xs">No issues</p>
            ) : (
              <div className="space-y-1.5">
                {projectIssues.map((issue) => (
                  <Link
                    className="flex items-center gap-2 rounded-sm border border-border/50 px-3 py-2 transition-colors hover:bg-muted/30"
                    href={`/control/issues/${issue.id}`}
                    key={issue.id}
                  >
                    <Icons.CircleDot
                      className="shrink-0 text-muted-foreground"
                      size={14}
                    />
                    <span className="truncate text-sm">
                      {issue.identifier ? `${issue.identifier} ` : ""}
                      {issue.title}
                    </span>
                    <StatusBadge
                      domain="issue"
                      size="sm"
                      status={issue.status}
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-medium text-sm">Properties</h2>
          <PropertiesPanel properties={properties} />
        </div>
      </div>
    </div>
  );
}
