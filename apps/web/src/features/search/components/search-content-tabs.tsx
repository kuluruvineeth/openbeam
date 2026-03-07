"use client";

import { Tabs, TabsList, TabsTrigger } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ContentType } from "../types";

type TabConfig = {
  id: ContentType;
  label: string;
  icon: keyof typeof Icons;
};

const TABS: TabConfig[] = [
  { id: "all", label: "All", icon: "Search" },
  { id: "documents", label: "Documents", icon: "FileIcon" },
  { id: "media", label: "Media", icon: "Video" },
];

function getCount(
  tabId: ContentType,
  documentCount: number,
  mediaCount: number
): number {
  if (tabId === "documents") {
    return documentCount;
  }
  if (tabId === "media") {
    return mediaCount;
  }
  return documentCount + mediaCount;
}

type Props = {
  value: ContentType;
  onChange: (value: ContentType) => void;
  documentCount: number;
  mediaCount: number;
};

export function SearchContentTabs({
  value,
  onChange,
  documentCount,
  mediaCount,
}: Props) {
  return (
    <Tabs onValueChange={(v) => onChange(v as ContentType)} value={value}>
      <TabsList className="h-auto gap-1 border border-border/50 bg-transparent p-1">
        {TABS.map((tab) => {
          const Icon = Icons[tab.icon];
          const count = getCount(tab.id, documentCount, mediaCount);

          return (
            <TabsTrigger
              className={cn(
                "gap-2 px-3 py-1.5 font-mono text-xs",
                "text-foreground/50 hover:bg-foreground/3 hover:text-foreground/70",
                "data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground data-[state=active]:shadow-none"
              )}
              key={tab.id}
              value={tab.id}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="text-[10px] text-foreground/40 tabular-nums">
                  {count.toLocaleString()}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
