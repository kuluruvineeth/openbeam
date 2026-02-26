"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { DashboardGrid } from "@/features/analytics";
import { PipelineBoard } from "@/features/pipeline";
import { cn } from "@/lib/utils";
import { filterEventsForSelectedAgent } from "../lib/mission-control-layout-utils";
import {
  buildWorkspaceDashboardLayout,
  buildWorkspacePipelineCards,
  buildWorkspaceSkillInstallHref,
  getWorkspacePrompt,
  getWorkspaceSkillRecommendations,
  summarizeWorkspace,
  WORKSPACE_ACTION_PRESETS,
  type WorkspaceActionPresetId,
} from "../lib/mission-workspace";
import {
  useAgentBoard,
  useAgentName,
  useMissionEvents,
  usePendingApprovals,
} from "../stores/mission-runtime-store";
import { MissionKanbanBoard } from "./board/mission-kanban-board";
import { MissionEventFeed } from "./mission-event-feed";

type WorkspaceViewId = "board" | "pipeline" | "analytics" | "timeline";

type MissionWorkspaceViewProps = {
  missionId: string;
  runId: string;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
};

const viewTabVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

const presetTabVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs transition-colors",
  {
    variants: {
      active: {
        true: "border-primary/30 bg-primary/10 text-primary",
        false:
          "border-border/60 bg-background text-muted-foreground hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

const skillActionVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs transition-colors",
  {
    variants: {
      active: {
        true: "border-primary/30 bg-primary/10 text-primary",
        false:
          "border-border/60 bg-background text-muted-foreground hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

const viewDefinitions = [
  { id: "board", label: "Board", icon: Icons.Grid3x3 },
  { id: "pipeline", label: "Pipeline", icon: Icons.GitFork },
  { id: "analytics", label: "Analytics", icon: Icons.BarChart },
  { id: "timeline", label: "Timeline", icon: Icons.Clock },
] as const;

export function MissionWorkspaceView({
  missionId,
  runId,
  selectedAgentId,
  onSelectAgent,
}: MissionWorkspaceViewProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<WorkspaceViewId>("board");
  const [activePreset, setActivePreset] =
    useState<WorkspaceActionPresetId>("find-leads");

  const allEvents = useMissionEvents(runId);
  const agentBoard = useAgentBoard();
  const selectedAgentName = useAgentName(selectedAgentId);
  const pendingApprovals = usePendingApprovals();

  const filteredEvents = useMemo(
    () =>
      filterEventsForSelectedAgent(
        allEvents,
        selectedAgentId,
        selectedAgentName
      ),
    [allEvents, selectedAgentId, selectedAgentName]
  );

  const workspaceSummary = useMemo(
    () => summarizeWorkspace(agentBoard),
    [agentBoard]
  );
  const pipelineCards = useMemo(
    () => buildWorkspacePipelineCards(agentBoard),
    [agentBoard]
  );
  const dashboardLayout = useMemo(
    () => buildWorkspaceDashboardLayout(agentBoard, filteredEvents),
    [agentBoard, filteredEvents]
  );
  const activePrompt = useMemo(
    () => getWorkspacePrompt(activePreset),
    [activePreset]
  );
  const recommendedSkills = useMemo(
    () => getWorkspaceSkillRecommendations(activePreset),
    [activePreset]
  );
  const pipelineBoardKey = useMemo(
    () =>
      pipelineCards
        .map((card) => `${card.id}:${card.columnId}:${card.updatedAt}`)
        .join("|"),
    [pipelineCards]
  );

  useHotkeys("shift+1", () => setActiveView("board"));
  useHotkeys("shift+2", () => setActiveView("pipeline"));
  useHotkeys("shift+3", () => setActiveView("analytics"));
  useHotkeys("shift+4", () => setActiveView("timeline"));

  const countForView = (viewId: WorkspaceViewId): number | undefined => {
    if (viewId === "board") {
      return workspaceSummary.totalAgents;
    }
    if (viewId === "pipeline") {
      return pipelineCards.length;
    }
    if (viewId === "timeline") {
      return filteredEvents.length;
    }
    return;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/50 border-b px-3 py-3">
        <p className="font-semibold text-base">One prompt for anything</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Mission workspace turns prompts into autonomous pipeline execution,
          analysis, and follow-through.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {WORKSPACE_ACTION_PRESETS.map((preset) => (
            <button
              className={presetTabVariants({
                active: activePreset === preset.id,
              })}
              key={preset.id}
              onClick={() => setActivePreset(preset.id)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-sm border border-border/60 bg-background px-3 py-2 text-sm">
          <Icons.Search className="text-muted-foreground" size={14} />
          <span className="truncate text-foreground/90">{activePrompt}</span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            running...
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">
            Install to mission
          </span>
          {recommendedSkills.map((skill) => (
            <button
              className={skillActionVariants({ active: false })}
              key={skill.name}
              onClick={() => {
                const installHref = buildWorkspaceSkillInstallHref(
                  missionId,
                  skill.name
                );
                router.push(installHref as `/connectors?${string}`);
              }}
              title={skill.reason}
              type="button"
            >
              <Icons.Plug size={12} />
              {skill.name}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <StatChip
            label="Agents"
            value={String(workspaceSummary.totalAgents)}
          />
          <StatChip
            label="Active"
            value={String(workspaceSummary.activeAgents)}
          />
          <StatChip label="Approvals" value={String(pendingApprovals.length)} />
          <StatChip label="Events" value={String(filteredEvents.length)} />
        </div>
      </div>

      <div className="flex items-center gap-1 border-border/50 border-b px-3 py-1.5">
        {viewDefinitions.map((view) => {
          const count = countForView(view.id);
          const Icon = view.icon;

          return (
            <button
              className={viewTabVariants({ active: activeView === view.id })}
              key={view.id}
              onClick={() => setActiveView(view.id)}
              type="button"
            >
              <Icon size={13} />
              {view.label}
              {typeof count === "number" && (
                <span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[10px] tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeView === "board" && (
          <MissionKanbanBoard
            onSelectAgent={onSelectAgent}
            selectedAgentId={selectedAgentId}
          />
        )}

        {activeView === "pipeline" && (
          <div className="h-full overflow-y-auto p-3">
            <PipelineBoard
              className="h-full"
              initialCards={pipelineCards}
              key={`${missionId}-${pipelineBoardKey}`}
              title="Mission Pipeline"
            />
          </div>
        )}

        {activeView === "analytics" && (
          <div className="h-full overflow-y-auto p-3">
            <DashboardGrid layout={dashboardLayout} />
          </div>
        )}

        {activeView === "timeline" && (
          <div className="h-full overflow-hidden p-3">
            <MissionEventFeed events={filteredEvents} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border/60 bg-background px-2 py-1",
        "font-mono text-[11px] text-muted-foreground"
      )}
    >
      <span className="text-foreground tabular-nums">{value}</span>
      {label}
    </span>
  );
}
