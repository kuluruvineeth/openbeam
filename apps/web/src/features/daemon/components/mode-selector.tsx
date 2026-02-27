"use client";

import { cn, Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openplane/ui/components/popover";
import { cva } from "class-variance-authority";
import { useCallback } from "react";
import { useSessionStore } from "../stores/session-store";

const modeItemVariants = cva(
  "flex w-full flex-col gap-0.5 rounded-sm px-3 py-2 text-left transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground",
        false: "text-foreground hover:bg-muted/50",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

interface ModeSelectorProps {
  serverId: string;
  agentId: string;
  onModeChange?: (modeId: string) => void;
}

export function ModeSelector({
  serverId,
  agentId,
  onModeChange,
}: ModeSelectorProps) {
  const agent = useSessionStore(
    (state) => state.sessions[serverId]?.agents.get(agentId) ?? null
  );

  const handleSelect = useCallback(
    (modeId: string) => {
      onModeChange?.(modeId);
    },
    [onModeChange]
  );

  if (!agent?.availableModes?.length) {
    return null;
  }

  const currentMode = agent.availableModes.find(
    (m) => m.id === agent.currentModeId
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="h-7 gap-1.5 px-2 font-medium text-xs"
          size="sm"
          variant="ghost"
        >
          <Icons.Settings2 className="size-3.5" />
          <span className="max-w-[120px] truncate">
            {currentMode?.label ?? "Default"}
          </span>
          <Icons.ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1" sideOffset={4}>
        <div className="flex flex-col gap-0.5">
          {agent.availableModes.map((mode) => {
            const isActive = mode.id === agent.currentModeId;
            return (
              <button
                className={modeItemVariants({ active: isActive })}
                key={mode.id}
                onClick={() => handleSelect(mode.id)}
                type="button"
              >
                <span className="font-medium text-sm">{mode.label}</span>
                {mode.description && (
                  <span
                    className={cn(
                      "text-xs",
                      isActive
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {mode.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
