"use client";

import { Button } from "@openplane/ui";
import { useQueryState } from "nuqs";
import { cn } from "@/lib/utils";

const tabs = [
  {
    name: "All",
    value: "all",
  },
  {
    name: "Connected",
    value: "connected",
  },
];

export function IntegrationsTabs() {
  const [currentTab, setTab] = useQueryState("tab", {
    defaultValue: "all",
  });

  return (
    <div className="flex">
      {tabs.map((tab) => (
        <Button
          className={cn(
            "px-4 text-sm transition-colors",
            "bg-background text-muted-foreground",
            currentTab === tab.value && "bg-secondary text-foreground",
            "hover:bg-accent"
          )}
          key={tab.value}
          onClick={() => setTab(tab.value)}
          type="button"
        >
          {tab.name}
        </Button>
      ))}
    </div>
  );
}
