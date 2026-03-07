"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import { useControlGoal } from "../../hooks/use-control-goals";
import { PropertiesPanel } from "../shared/properties-panel";
import { StatusBadge } from "../shared/status-badge";

type GoalDetailPanelProps = {
  goalId: string | null;
  onClose: () => void;
};

const LEVEL_LABELS: Record<string, string> = {
  COMPANY: "Company",
  TEAM: "Team",
  AGENT: "Agent",
  TASK: "Task",
};

export function GoalDetailPanel({ goalId, onClose }: GoalDetailPanelProps) {
  const { data: goal } = useControlGoal(goalId ?? "");

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={!!goalId}>
      <SheetContent className="w-[400px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle className="text-base">{goal?.title ?? "Goal"}</SheetTitle>
        </SheetHeader>

        {goal && (
          <div className="mt-4 space-y-4">
            {goal.description && (
              <p className="text-muted-foreground text-sm">
                {goal.description}
              </p>
            )}

            <PropertiesPanel
              properties={[
                {
                  label: "Status",
                  value: <StatusBadge domain="goal" status={goal.status} />,
                },
                {
                  label: "Level",
                  value: (
                    <span className="text-sm">
                      {LEVEL_LABELS[goal.level] ?? goal.level}
                    </span>
                  ),
                },
                {
                  label: "Parent",
                  value: goal.parent ? (
                    <span className="text-sm">{goal.parent.title}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  ),
                },
                {
                  label: "Owner",
                  value: goal.ownerAgent ? (
                    <span className="text-sm">{goal.ownerAgent.name}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Unassigned
                    </span>
                  ),
                },
                {
                  label: "Created",
                  value: (
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(goal.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  ),
                },
              ]}
            />

            {goal.children && goal.children.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Sub-goals
                </h3>
                <div className="space-y-1">
                  {goal.children.map(
                    (child: { id: string; title: string; status: string }) => (
                      <div
                        className="flex items-center gap-2 rounded-sm border border-border/50 px-3 py-1.5"
                        key={child.id}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {child.title}
                        </span>
                        <StatusBadge
                          domain="goal"
                          size="sm"
                          status={child.status}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
