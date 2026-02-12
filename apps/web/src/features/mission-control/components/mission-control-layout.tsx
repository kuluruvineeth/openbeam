"use client";

import {
  Icons,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@openplane/ui";
import { useCallback, useMemo, useState } from "react";
import { filterEventsForSelectedAgent } from "../lib/mission-control-layout-utils";
import {
  deriveMissionOutcome,
  type MissionOutcomeSnapshot,
} from "../lib/mission-outcome";
import { formatContextualTimestamp } from "../lib/time-display";
import {
  useAgentBoard,
  useMissionEvents,
} from "../stores/mission-runtime-store";
import { AgentLanesPanel } from "./agent-lanes-panel";
import { MissionEventFeed } from "./mission-event-feed";

const TERMINAL_MISSION_STATUSES = new Set([
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

type MissionControlLayoutProps = {
  missionId: string;
  runId: string;
  missionStatus: string;
  onOpenArtifacts: () => void;
};

export function MissionControlLayout({
  missionId,
  runId,
  missionStatus,
  onOpenArtifacts,
}: MissionControlLayoutProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const agentBoard = useAgentBoard();

  const selectedAgentName = selectedAgentId
    ? (agentBoard[selectedAgentId]?.agentName ?? null)
    : null;

  const handleSelectAgent = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId);
  }, []);

  return (
    <ResizablePanelGroup className="flex-1" direction="horizontal">
      <ResizablePanel defaultSize={32} maxSize={45} minSize={24}>
        <AgentLanesPanel
          missionId={missionId}
          onSelectAgent={handleSelectAgent}
          selectedAgentId={selectedAgentId}
        />
      </ResizablePanel>
      <ResizableHandle className="bg-border/40 transition-colors hover:bg-border/60" />
      <ResizablePanel defaultSize={68} minSize={40}>
        <TimelinePanel
          missionStatus={missionStatus}
          onClearFilter={() => setSelectedAgentId(null)}
          onOpenArtifacts={onOpenArtifacts}
          runId={runId}
          selectedAgentId={selectedAgentId}
          selectedAgentName={selectedAgentName}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

type TimelinePanelProps = {
  runId: string;
  missionStatus: string;
  selectedAgentId: string | null;
  selectedAgentName: string | null;
  onClearFilter: () => void;
  onOpenArtifacts: () => void;
};

function TimelinePanel({
  runId,
  missionStatus,
  selectedAgentId,
  selectedAgentName,
  onClearFilter,
  onOpenArtifacts,
}: TimelinePanelProps) {
  const allEvents = useMissionEvents(runId);
  const filteredEvents = useMemo(
    () =>
      filterEventsForSelectedAgent(
        allEvents,
        selectedAgentId,
        selectedAgentName
      ),
    [allEvents, selectedAgentId, selectedAgentName]
  );
  const outcome = useMemo(() => deriveMissionOutcome(allEvents), [allEvents]);
  const isFiltered = selectedAgentId !== null;
  const isTerminalMission = TERMINAL_MISSION_STATUSES.has(missionStatus);

  return (
    <div className="flex h-full flex-col border-border/50 border-l dark:border-[#1d1d1d]">
      <div className="flex items-center gap-2 border-border/50 border-b px-3 py-2 dark:border-[#1d1d1d]">
        <Icons.Clock className="text-muted-foreground" size={14} />
        <span className="font-medium text-xs">Timeline</span>
        {filteredEvents.length > 0 && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-[10px] tabular-nums">
            {filteredEvents.length}
          </span>
        )}
        {isFiltered && (
          <span className="rounded-sm border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
            {selectedAgentName ?? "Selected agent"}
          </span>
        )}
        {isFiltered && (
          <button
            aria-label="Clear timeline agent filter"
            className="ml-auto inline-flex items-center gap-1 rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={onClearFilter}
            type="button"
          >
            <Icons.Close size={10} />
            Clear filter
          </button>
        )}
      </div>
      {(outcome || isTerminalMission) && (
        <MissionOutcomeStrip
          isTerminalMission={isTerminalMission}
          onOpenArtifacts={onOpenArtifacts}
          outcome={outcome}
        />
      )}
      <div className="relative flex-1 overflow-hidden p-2">
        <MissionEventFeed
          events={filteredEvents}
          missionStatus={missionStatus}
        />
      </div>
    </div>
  );
}

type MissionOutcomeStripProps = {
  outcome: MissionOutcomeSnapshot | null;
  isTerminalMission: boolean;
  onOpenArtifacts: () => void;
};

function MissionOutcomeStrip({
  outcome,
  isTerminalMission,
  onOpenArtifacts,
}: MissionOutcomeStripProps) {
  if (!(outcome || isTerminalMission)) {
    return null;
  }

  if (!outcome) {
    return (
      <div className="border-border/40 border-b px-3 py-2">
        <div className="flex items-center gap-2 rounded-sm border border-border/60 bg-muted/20 px-2 py-2">
          <Icons.File className="text-muted-foreground" size={14} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
              Result
            </p>
            <p className="truncate text-sm">
              Mission completed but no explicit output payload was captured.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            onClick={onOpenArtifacts}
            type="button"
          >
            <Icons.ExternalLink size={10} />
            Open results
          </button>
        </div>
      </div>
    );
  }

  const sourceLabel = outcome.source === "artifact" ? "Published" : "Derived";

  return (
    <div className="border-border/40 border-b px-3 py-2">
      <div className="flex items-start gap-2 rounded-sm border border-border/60 bg-muted/20 px-2 py-2">
        <Icons.FileText className="mt-0.5 text-muted-foreground" size={14} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
              Result
            </span>
            <span className="rounded-sm border border-border/60 bg-background px-1.5 py-0.5 text-[10px]">
              {sourceLabel}
            </span>
            <time className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              {formatContextualTimestamp(outcome.timestamp, Date.now())}
            </time>
          </div>
          <p className="truncate text-sm">{outcome.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {outcome.subtitle}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          onClick={onOpenArtifacts}
          type="button"
        >
          <Icons.ExternalLink size={10} />
          View results
        </button>
      </div>
    </div>
  );
}
