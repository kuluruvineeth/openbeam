"use client";

import { Button, Icons } from "@openplane/ui";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useAgentName } from "../stores/mission-runtime-store";
import { AgentLanesPanel } from "./agent-lanes-panel";
import { MissionKanbanBoard } from "./board/mission-kanban-board";
import { AgentChatFeed } from "./chat/agent-chat-feed";

const LEFT_PANEL_WIDTH = 280;
const RIGHT_PANEL_WIDTH = 420;
const COLLAPSE_TRANSITION = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

type MissionControlLayoutProps = {
  missionId: string;
  runId: string;
  missionStatus: string;
};

export function MissionControlLayout({
  missionId,
  runId,
}: MissionControlLayoutProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const selectedAgentName = useAgentName(selectedAgentId);

  const handleSelectAgent = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId);
  }, []);

  const toggleLeft = useCallback(() => {
    setLeftCollapsed((prev) => !prev);
  }, []);

  const toggleRight = useCallback(() => {
    setRightCollapsed((prev) => !prev);
  }, []);

  useHotkeys("mod+shift+b", (e) => {
    e.preventDefault();
    toggleLeft();
  });
  useHotkeys("mod+b", (e) => {
    e.preventDefault();
    toggleRight();
  });
  useHotkeys("escape", () => setSelectedAgentId(null));

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <motion.div
        animate={{ width: leftCollapsed ? 0 : LEFT_PANEL_WIDTH }}
        className="shrink-0 overflow-hidden"
        transition={COLLAPSE_TRANSITION}
      >
        <div className="h-full" style={{ width: LEFT_PANEL_WIDTH }}>
          <AgentLanesPanel
            missionId={missionId}
            onCollapse={toggleLeft}
            onSelectAgent={handleSelectAgent}
            selectedAgentId={selectedAgentId}
          />
        </div>
      </motion.div>

      <div className="relative flex-1 overflow-hidden">
        {leftCollapsed && (
          <Button
            className="absolute top-1.5 left-1.5 z-10 h-7 w-7"
            onClick={toggleLeft}
            size="icon"
            variant="ghost"
          >
            <Icons.SidebarRight size={14} />
          </Button>
        )}
        {rightCollapsed && (
          <Button
            className="absolute top-1.5 right-1.5 z-10 h-7 w-7"
            onClick={toggleRight}
            size="icon"
            variant="ghost"
          >
            <Icons.SidebarRight className="rotate-180" size={14} />
          </Button>
        )}
        <MissionKanbanBoard
          onSelectAgent={handleSelectAgent}
          selectedAgentId={selectedAgentId}
        />
      </div>

      <motion.div
        animate={{ width: rightCollapsed ? 0 : RIGHT_PANEL_WIDTH }}
        className="shrink-0 overflow-hidden"
        transition={COLLAPSE_TRANSITION}
      >
        <div className="h-full" style={{ width: RIGHT_PANEL_WIDTH }}>
          <div className="flex h-full flex-col border-border/50 border-l dark:border-[#1d1d1d]">
            <div className="flex items-center gap-1.5 border-border/50 border-b px-3 py-1.5 dark:border-[#1d1d1d]">
              <Icons.MessageSquare
                className="text-muted-foreground"
                size={13}
              />
              <span className="font-medium text-xs">Live Feed</span>
              {selectedAgentName && (
                <span className="rounded-sm border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  {selectedAgentName}
                </span>
              )}
              <button
                aria-label="Collapse live feed panel"
                className="ml-auto inline-flex items-center justify-center rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                onClick={toggleRight}
                type="button"
              >
                <Icons.SidebarRight className="rotate-180" size={13} />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden p-2">
              <AgentChatFeed
                missionId={missionId}
                runId={runId}
                selectedAgentId={selectedAgentId}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
