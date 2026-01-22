"use client";

import type { ToolCategory } from "@openplane/types/ai";
import { Badge } from "@openplane/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openplane/ui/components/tooltip";
import { cn } from "@openplane/ui/utils";
import {
  Brain,
  Database,
  FileText,
  Link,
  MessageSquare,
  Search,
} from "lucide-react";

type CapabilityConfig = {
  icon: typeof Search;
  label: string;
  color: string;
};

const CAPABILITY_CONFIG: Partial<Record<ToolCategory, CapabilityConfig>> = {
  search: {
    icon: Search,
    label: "Search",
    color: "bg-blue-500/10 text-blue-500",
  },
  rag: {
    icon: MessageSquare,
    label: "RAG",
    color: "bg-purple-500/10 text-purple-500",
  },
  documents: {
    icon: FileText,
    label: "Documents",
    color: "bg-green-500/10 text-green-500",
  },
  connectors: {
    icon: Link,
    label: "Connectors",
    color: "bg-orange-500/10 text-orange-500",
  },
  data: {
    icon: Database,
    label: "Data",
    color: "bg-cyan-500/10 text-cyan-500",
  },
  analysis: {
    icon: Brain,
    label: "Analysis",
    color: "bg-pink-500/10 text-pink-500",
  },
};

type AgentCapabilityBadgesProps = {
  capabilities: ToolCategory[];
  maxVisible?: number;
  compact?: boolean;
  className?: string;
};

export function AgentCapabilityBadges({
  capabilities,
  maxVisible = 3,
  compact = false,
  className,
}: AgentCapabilityBadgesProps) {
  if (!capabilities || capabilities.length === 0) {
    return null;
  }

  const visibleCapabilities = capabilities.slice(0, maxVisible);
  const remainingCount = capabilities.length - maxVisible;

  if (compact) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className={cn("flex items-center gap-1", className)}>
          {visibleCapabilities.map((capability) => {
            const config = CAPABILITY_CONFIG[capability];
            if (!config) {
              return null;
            }

            const Icon = config.icon;

            return (
              <Tooltip key={capability}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded",
                      config.color
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{config.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-5 items-center justify-center rounded bg-muted px-1.5 text-muted-foreground text-xs">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="flex flex-col gap-0.5">
                  {capabilities.slice(maxVisible).map((cap) => {
                    const config = CAPABILITY_CONFIG[cap];
                    return (
                      <span className="text-xs" key={cap}>
                        {config?.label ?? cap}
                      </span>
                    );
                  })}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visibleCapabilities.map((capability) => {
        const config = CAPABILITY_CONFIG[capability];
        if (!config) {
          return null;
        }

        const Icon = config.icon;

        return (
          <Badge
            className={cn("gap-1 text-[10px]", config.color)}
            key={capability}
            variant="secondary"
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      })}
      {remainingCount > 0 && (
        <Badge className="text-[10px]" variant="secondary">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}
