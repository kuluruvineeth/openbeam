"use client";

import { cn, Icons } from "@openbeam/ui";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { DashboardLayout, DashboardPanel } from "../types";
import { ChartRenderer } from "./chart-renderer";

type DashboardGridProps = {
  layout: DashboardLayout;
  onPanelClick?: (panelId: string) => void;
  className?: string;
};

export function DashboardGrid({
  layout,
  onPanelClick,
  className,
}: DashboardGridProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const panels = layout.panels;
  const gridColumns = useMemo(
    () => deriveGridColumns(panels.length),
    [panels.length]
  );

  const navigatePanel = useCallback(
    (direction: "next" | "prev") => {
      setFocusedIndex((prev) => {
        if (direction === "next") {
          return Math.min(panels.length - 1, prev + 1);
        }
        return Math.max(0, prev - 1);
      });
    },
    [panels.length]
  );

  useHotkeys("tab", () => navigatePanel("next"), { preventDefault: true });
  useHotkeys("shift+tab", () => navigatePanel("prev"), {
    preventDefault: true,
  });
  useHotkeys("enter", () => {
    const panel = panels[focusedIndex];
    if (panel) {
      onPanelClick?.(panel.id);
    }
  });

  if (panels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
        <Icons.BarChart size={32} />
        <span className="text-sm">No charts configured</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {layout.title && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{layout.title}</h2>
          {layout.refreshInterval && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Icons.RefreshCw size={12} />
              Auto-refresh: {layout.refreshInterval}s
            </span>
          )}
        </div>
      )}

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        }}
      >
        {panels.map((panel, index) => (
          <DashboardPanelCard
            isFocused={focusedIndex === index}
            key={panel.id}
            onClick={() => onPanelClick?.(panel.id)}
            panel={panel}
          />
        ))}
      </div>
    </div>
  );
}

type DashboardPanelCardProps = {
  panel: DashboardPanel;
  isFocused: boolean;
  onClick?: () => void;
};

function DashboardPanelCard({
  panel,
  isFocused,
  onClick,
}: DashboardPanelCardProps) {
  const gridStyle: React.CSSProperties = {};
  if (panel.gridColumn) {
    gridStyle.gridColumn = panel.gridColumn;
  }
  if (panel.gridRow) {
    gridStyle.gridRow = panel.gridRow;
  }

  return (
    <button
      className={cn(
        "rounded-md border bg-background p-3 text-left transition-colors",
        isFocused ? "border-primary" : "border-border/50"
      )}
      onClick={onClick}
      style={gridStyle}
      type="button"
    >
      {panel.config.title && (
        <h3 className="mb-2 font-medium text-sm">{panel.config.title}</h3>
      )}
      <ChartRenderer
        compact={panel.type !== "metric"}
        config={panel.config}
        data={panel.data}
        type={panel.type}
      />
    </button>
  );
}

function deriveGridColumns(panelCount: number): number {
  if (panelCount <= 1) {
    return 1;
  }
  if (panelCount <= 4) {
    return 2;
  }
  return 3;
}
