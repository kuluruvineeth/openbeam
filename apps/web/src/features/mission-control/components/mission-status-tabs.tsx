"use client";

import { Tabs, TabsList, TabsTrigger } from "@openplane/ui";
import {
  type MissionStatusFilter,
  useMissionFilterParams,
} from "../hooks/use-mission-filter-params";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "DRAFT", label: "Draft" },
] as const;

type MissionStatusTabsProps = {
  counts?: Record<string, number>;
};

function MissionStatusTabs({ counts }: MissionStatusTabsProps) {
  const [params, setParams] = useMissionFilterParams();

  return (
    <Tabs
      onValueChange={(value) =>
        setParams({
          status: value === "all" ? null : (value as MissionStatusFilter),
        })
      }
      value={params.status ?? "all"}
    >
      <TabsList className="inline-flex h-9">
        {STATUS_TABS.map((tab) => {
          const count = counts?.[tab.value];
          return (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="ml-1.5 text-muted-foreground text-xs tabular-nums">
                  {count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

export { MissionStatusTabs, STATUS_TABS };
export type { MissionStatusTabsProps };
