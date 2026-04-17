"use client";

import { Badge, Skeleton } from "@openbeam/ui";
import { cn } from "@openbeam/ui/utils/cn";
import { useState } from "react";
import { Icons } from "@/components/icons";

interface Step {
  id: string;
  sequence: number;
  type: string;
  name: string;
  input: unknown;
  output: unknown;
  durationMs: number | null;
}

const STEP_ICONS: Record<string, typeof Icons.Play> = {
  tool_call: Icons.Settings2,
  ai_generation: Icons.BotIcon,
  memory_read: Icons.Search,
  memory_write: Icons.Upload,
  notification: Icons.AlertCircle,
  proposal: Icons.CheckIcon,
  connector_call: Icons.GitBranch,
  context: Icons.Info,
};

const STEP_COLORS: Record<string, string> = {
  tool_call: "text-blue-600",
  ai_generation: "text-violet-600",
  memory_read: "text-emerald-600",
  memory_write: "text-emerald-600",
  notification: "text-amber-600",
  proposal: "text-orange-600",
  connector_call: "text-blue-600",
  context: "text-muted-foreground",
};

function formatDuration(ms: number | null): string {
  if (ms === null) {
    return "\u2014";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function StepRow({ step }: { step: Step }) {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = STEP_ICONS[step.type] ?? Icons.Play;
  const colorClass = STEP_COLORS[step.type] ?? "text-muted-foreground";
  const hasError =
    step.output &&
    typeof step.output === "object" &&
    "error" in (step.output as Record<string, unknown>);

  return (
    <div className="group">
      <button
        className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-xs transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span className="w-5 text-center text-muted-foreground/50">
          {step.sequence}
        </span>
        <IconComponent className={colorClass} size={14} />
        <span className="font-medium">{step.name}</span>
        <Badge className="px-1.5 py-0 text-[10px]" variant="outline">
          {step.type.replace(/_/g, " ")}
        </Badge>
        {hasError && (
          <span className="text-[10px] text-destructive">error</span>
        )}
        <span className="ml-auto text-muted-foreground/60">
          {formatDuration(step.durationMs)}
        </span>
        <Icons.ChevronDown
          className={cn(
            "text-muted-foreground/40 transition-transform",
            expanded && "rotate-180"
          )}
          size={12}
        />
      </button>

      {expanded && (
        <div className="ml-8 space-y-2 border-border/30 border-l px-4 py-2">
          {step.input !== null && step.input !== undefined && (
            <div>
              <span className="mb-1 block font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                Input
              </span>
              <pre className="overflow-x-auto rounded-sm bg-muted/50 px-3 py-2 font-mono text-[11px] leading-relaxed">
                {formatPayload(step.input)}
              </pre>
            </div>
          )}
          {step.output !== null && step.output !== undefined && (
            <div>
              <span className="mb-1 block font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                Output
              </span>
              <pre
                className={cn(
                  "overflow-x-auto rounded-sm px-3 py-2 font-mono text-[11px] leading-relaxed",
                  hasError ? "bg-destructive/5" : "bg-muted/50"
                )}
              >
                {formatPayload(step.output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatPayload(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function StepTrace({ steps }: { steps: Step[] }) {
  if (steps.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-xs">
        No steps recorded
      </p>
    );
  }

  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 pb-2 text-muted-foreground text-xs">
        <span>{steps.length} steps</span>
        <span>{formatDuration(totalDuration)} total</span>
      </div>
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
    </div>
  );
}

export function StepTraceSkeleton() {
  return (
    <div className="space-y-2 px-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton className="h-8 w-full" key={`step-sk-${i.toString()}`} />
      ))}
    </div>
  );
}
