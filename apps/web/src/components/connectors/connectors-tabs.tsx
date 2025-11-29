"use client";

import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  {
    name: "Connected",
    value: "connected",
  },
  {
    name: "Available",
    value: "available",
  },
];

export function ConnectorsTabs() {
  const [currentTab, setTab] = useQueryState("tab", {
    defaultValue: "connected",
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
