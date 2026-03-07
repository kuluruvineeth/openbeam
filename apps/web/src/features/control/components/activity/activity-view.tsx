"use client";

import { Button } from "@openbeam/ui";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { useControlActivity } from "../../hooks/use-control-activity";
import { EmptyState } from "../shared/empty-state";
import { ActivityRow } from "./activity-row";

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "AGENT", label: "Agent" },
  { value: "ISSUE", label: "Issue" },
  { value: "PROJECT", label: "Project" },
  { value: "GOAL", label: "Goal" },
  { value: "APPROVAL", label: "Approval" },
  { value: "SECRET", label: "Secret" },
  { value: "MEMBERSHIP", label: "Membership" },
];

export function ActivityView() {
  const [entityType, setEntityType] = useState("");
  const { activity, isLoading } = useControlActivity(
    entityType ? { entityType } : undefined
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">Activity</h1>
          <p className="text-muted-foreground text-xs">
            {activity.length} entries
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {ENTITY_TYPE_OPTIONS.map((opt) => (
          <Button
            className="h-7 text-xs"
            key={opt.value}
            onClick={() => setEntityType(opt.value)}
            size="sm"
            variant={entityType === opt.value ? "secondary" : "ghost"}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {activity.length === 0 && !isLoading ? (
        <EmptyState
          description="No activity entries found for the selected filter."
          icon={<Icons.List size={24} />}
          title="No activity"
        />
      ) : (
        <div className="rounded-sm border border-border/50">
          {activity.map((entry) => (
            <ActivityRow entry={entry} key={entry.id} />
          ))}
        </div>
      )}
    </div>
  );
}
