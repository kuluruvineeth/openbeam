"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useHotkeys } from "react-hotkeys-hook";
import type { DetailTab } from "../hooks/use-mission-detail-params";

const tabVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary/10 font-medium text-primary",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

type TabDefinition = {
  id: DetailTab;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

type MissionDetailContentProps = {
  missionId: string;
  runId: string;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
};

export function MissionDetailContent({
  missionId: _missionId,
  runId: _runId,
  activeTab,
  onTabChange,
}: MissionDetailContentProps) {
  useHotkeys("1", () => onTabChange("timeline"));
  useHotkeys("2", () => onTabChange("agents"));
  useHotkeys("3", () => onTabChange("tasks"));
  useHotkeys("4", () => onTabChange("approvals"));
  useHotkeys("5", () => onTabChange("artifacts"));
  useHotkeys("6", () => onTabChange("memory"));
  useHotkeys("7", () => onTabChange("budget"));

  const tabs: TabDefinition[] = [
    { id: "timeline", label: "Timeline", icon: <Icons.Clock size={14} /> },
    { id: "agents", label: "Agents", icon: <Icons.Users size={14} /> },
    { id: "tasks", label: "Tasks", icon: <Icons.Task size={14} /> },
    {
      id: "approvals",
      label: "Approvals",
      icon: <Icons.ShieldAlert size={14} />,
    },
    { id: "artifacts", label: "Artifacts", icon: <Icons.File size={14} /> },
    { id: "memory", label: "Memory", icon: <Icons.Database size={14} /> },
    { id: "budget", label: "Budget", icon: <Icons.Coins size={14} /> },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-border/50 border-b px-3 py-1.5">
        {tabs.map((tab) => (
          <button
            className={tabVariants({ active: activeTab === tab.id })}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 rounded-sm bg-muted px-1 py-0.5 font-medium text-[10px] tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <TabPlaceholder tab={activeTab} />
      </div>
    </div>
  );
}

function TabPlaceholder({ tab }: { tab: DetailTab }) {
  const labels: Record<DetailTab, string> = {
    timeline: "Timeline",
    agents: "Agents",
    tasks: "Tasks",
    approvals: "Approvals",
    artifacts: "Artifacts",
    memory: "Memory",
    budget: "Budget",
  };

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <span className="text-sm">{labels[tab]} panel</span>
    </div>
  );
}

export { tabVariants };
