"use client";

import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
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
            "dark:bg-[#1D1D1D] dark:text-[#878787]",
            "bg-white text-gray-600",
            currentTab === tab.value &&
              "bg-gray-100 text-primary dark:bg-[#2C2C2C]",
            "hover:bg-accent dark:hover:bg-accent"
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
