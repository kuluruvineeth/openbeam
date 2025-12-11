"use client";

import { Icons } from "@/components/icons";
import type { ContentType } from "@/lib/search-types";
import { cn } from "@/lib/utils";

type TabConfig = {
  id: ContentType;
  label: string;
  icon: keyof typeof Icons;
};

const TABS: TabConfig[] = [
  { id: "all", label: "All", icon: "Search" },
  { id: "documents", label: "Documents", icon: "FileIcon" },
  { id: "videos", label: "Videos", icon: "Video" },
];

function getCount(
  tabId: ContentType,
  documentCount: number,
  videoCount: number
): number {
  if (tabId === "documents") {
    return documentCount;
  }
  if (tabId === "videos") {
    return videoCount;
  }
  return documentCount + videoCount;
}

type Props = {
  value: ContentType;
  onChange: (value: ContentType) => void;
  documentCount: number;
  videoCount: number;
};

export function SearchContentTabs({
  value,
  onChange,
  documentCount,
  videoCount,
}: Props) {
  return (
    <div className="flex items-center gap-1 border border-border/50 p-1">
      {TABS.map((tab) => {
        const isActive = value === tab.id;
        const Icon = Icons[tab.icon];
        const count = getCount(tab.id, documentCount, videoCount);

        return (
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 font-mono text-xs transition-colors",
              isActive
                ? "bg-foreground/5 text-foreground"
                : "text-foreground/50 hover:bg-foreground/3 hover:text-foreground/70"
            )}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon size={14} />
            <span>{tab.label}</span>
            {count > 0 && (
              <span className="text-[10px] text-foreground/40 tabular-nums">
                {count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
