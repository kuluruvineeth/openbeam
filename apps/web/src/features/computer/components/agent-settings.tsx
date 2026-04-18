"use client";

import { Button, Input } from "@openbeam/ui";
import { cn } from "@openbeam/ui/utils/cn";
import { useState } from "react";
import { AGENT_STATUS_STYLES } from "../constants";
import { useUpdateAgent } from "../hooks/use-computer";

interface AgentSettingsProps {
  agentId: string;
  status: string;
  mode: string;
  scheduleCron: string | null;
}

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const;
const MODE_OPTIONS = ["AUTONOMOUS", "APPROVAL", "REPORT_ONLY"] as const;

export function AgentSettings({
  agentId,
  status,
  mode,
  scheduleCron,
}: AgentSettingsProps) {
  const updateAgent = useUpdateAgent();
  const [cronValue, setCronValue] = useState(scheduleCron ?? "");
  const cronDirty = cronValue !== (scheduleCron ?? "");

  function saveCron() {
    updateAgent.mutate({
      agentId,
      scheduleCron: cronValue || null,
    });
  }

  return (
    <div className="space-y-6">
      <SettingsSection label="Status">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              className={cn(
                "rounded-sm border px-3 py-1.5 font-medium text-xs transition-colors",
                status === opt
                  ? AGENT_STATUS_STYLES[opt]
                  : "border-border/30 text-muted-foreground hover:border-border hover:bg-muted/30"
              )}
              disabled={updateAgent.isPending || status === opt}
              key={opt}
              onClick={() => updateAgent.mutate({ agentId, status: opt })}
              type="button"
            >
              {opt.toLowerCase()}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection label="Execution Mode">
        <div className="flex flex-wrap gap-1.5">
          {MODE_OPTIONS.map((opt) => (
            <button
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs transition-colors",
                mode === opt
                  ? "border-primary/30 bg-primary/5 font-medium"
                  : "border-border/30 text-muted-foreground hover:border-border hover:bg-muted/30"
              )}
              disabled={updateAgent.isPending || mode === opt}
              key={opt}
              onClick={() => updateAgent.mutate({ agentId, mode: opt })}
              type="button"
            >
              {opt.toLowerCase().replace("_", " ")}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          {mode === "AUTONOMOUS" && "Agent executes actions without approval"}
          {mode === "APPROVAL" &&
            "Agent proposes actions and waits for approval"}
          {mode === "REPORT_ONLY" &&
            "Agent reports findings but takes no action"}
        </p>
      </SettingsSection>

      <SettingsSection label="Schedule">
        <div className="flex items-center gap-2">
          <Input
            className="h-8 max-w-[200px] font-mono text-xs"
            onChange={(e) => setCronValue(e.target.value)}
            placeholder="0 8 * * 1"
            value={cronValue}
          />
          {cronDirty && (
            <Button
              disabled={updateAgent.isPending}
              onClick={saveCron}
              size="sm"
              variant="outline"
            >
              Save
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          Cron expression for scheduled runs. Leave empty for manual-only.
        </p>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </h3>
      {children}
    </div>
  );
}
