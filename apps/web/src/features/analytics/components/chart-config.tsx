"use client";

import { cn, Input, Switch } from "@openbeam/ui";
import { cva } from "class-variance-authority";
import { useCallback } from "react";
import type { ChartConfig, ChartType } from "../types";

const chartTypeButtonVariants = cva(
  "flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs transition-colors",
  {
    variants: {
      selected: {
        true: "border-primary bg-primary/10 text-primary",
        false:
          "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

type ChartConfigPanelProps = {
  type: ChartType;
  config: ChartConfig;
  onTypeChange: (type: ChartType) => void;
  onConfigChange: (config: ChartConfig) => void;
  className?: string;
};

const CHART_TYPE_OPTIONS: Array<{ type: ChartType; label: string }> = [
  { type: "line", label: "Line" },
  { type: "bar", label: "Bar" },
  { type: "area", label: "Area" },
  { type: "pie", label: "Pie" },
  { type: "donut", label: "Donut" },
  { type: "funnel", label: "Funnel" },
  { type: "scatter", label: "Scatter" },
  { type: "metric", label: "Metric" },
];

export function ChartConfigPanel({
  type,
  config,
  onTypeChange,
  onConfigChange,
  className,
}: ChartConfigPanelProps) {
  const updateConfig = useCallback(
    (partial: Partial<ChartConfig>) => {
      onConfigChange({ ...config, ...partial });
    },
    [config, onConfigChange]
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-md border border-border/50 bg-muted/30 p-4",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          Chart Type
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CHART_TYPE_OPTIONS.map((option) => (
            <button
              className={cn(
                chartTypeButtonVariants({ selected: type === option.type })
              )}
              key={option.type}
              onClick={() => onTypeChange(option.type)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs">Title</span>
        <Input
          className="h-8 text-sm"
          onChange={(e) => updateConfig({ title: e.target.value })}
          placeholder="Chart title"
          value={config.title ?? ""}
        />
      </div>

      {type !== "pie" &&
        type !== "donut" &&
        type !== "funnel" &&
        type !== "metric" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">X Field</span>
              <Input
                className="h-8 text-sm"
                onChange={(e) => updateConfig({ xField: e.target.value })}
                placeholder="x"
                value={config.xField ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs">Y Field</span>
              <Input
                className="h-8 text-sm"
                onChange={(e) => updateConfig({ yField: e.target.value })}
                placeholder="y"
                value={config.yField ?? ""}
              />
            </div>
          </div>
        )}

      {(type === "pie" || type === "donut" || type === "funnel") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">Name Key</span>
            <Input
              className="h-8 text-sm"
              onChange={(e) => updateConfig({ nameKey: e.target.value })}
              placeholder="name"
              value={config.nameKey ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">Value Key</span>
            <Input
              className="h-8 text-sm"
              onChange={(e) => updateConfig({ valueKey: e.target.value })}
              placeholder="value"
              value={config.valueKey ?? ""}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Show Legend</span>
        <Switch
          checked={config.showLegend !== false}
          onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Show Grid</span>
        <Switch
          checked={config.showGrid !== false}
          onCheckedChange={(checked) => updateConfig({ showGrid: checked })}
        />
      </div>
    </div>
  );
}
