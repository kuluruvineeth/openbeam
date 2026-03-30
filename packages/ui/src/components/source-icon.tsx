"use client";

import * as React from "react";
import { cn } from "../utils/cn";

const SOURCE_CONFIG: Record<string, { bg: string; label: string }> = {
  SLACK: { bg: "bg-purple-500", label: "SL" },
  GITHUB: { bg: "bg-zinc-700 dark:bg-zinc-300", label: "GH" },
  NOTION: { bg: "bg-zinc-900 dark:bg-zinc-100", label: "NO" },
  GOOGLE_DRIVE: { bg: "bg-blue-500", label: "GD" },
  LINEAR: { bg: "bg-indigo-500", label: "LN" },
  JIRA: { bg: "bg-blue-600", label: "JR" },
  CONFLUENCE: { bg: "bg-blue-500", label: "CF" },
  GMAIL: { bg: "bg-red-500", label: "GM" },
  OUTLOOK: { bg: "bg-blue-600", label: "OL" },
  SHAREPOINT: { bg: "bg-teal-600", label: "SP" },
  TEAMS: { bg: "bg-indigo-600", label: "TM" },
  SALESFORCE: { bg: "bg-sky-500", label: "SF" },
  ASANA: { bg: "bg-rose-500", label: "AS" },
  HUBSPOT: { bg: "bg-orange-500", label: "HS" },
  ZENDESK: { bg: "bg-emerald-600", label: "ZD" },
  INTERCOM: { bg: "bg-blue-500", label: "IC" },
  FIGMA: { bg: "bg-violet-500", label: "FG" },
  DROPBOX: { bg: "bg-blue-600", label: "DB" },
  BOX: { bg: "bg-blue-500", label: "BX" },
};

type SourceIconProps = {
  type: string;
  size?: number;
  className?: string;
};

const SourceIcon = React.forwardRef<HTMLDivElement, SourceIconProps>(
  ({ type, size = 24, className }, ref) => {
    const config = SOURCE_CONFIG[type.toUpperCase()] ?? {
      bg: "bg-zinc-500",
      label: type.slice(0, 2).toUpperCase(),
    };

    return (
      <div
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-sm font-semibold text-white",
          config.bg,
          className
        )}
        ref={ref}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {config.label}
      </div>
    );
  }
);
SourceIcon.displayName = "SourceIcon";

export { SourceIcon, SOURCE_CONFIG };
export type { SourceIconProps };
