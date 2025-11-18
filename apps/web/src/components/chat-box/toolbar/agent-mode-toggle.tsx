"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  isAgenticMode: boolean;
  onAgenticModeToggle: () => void;
};

export function AgentModeToggle({ isAgenticMode, onAgenticModeToggle }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="mr-[18px] cursor-pointer"
          onClick={onAgenticModeToggle}
          variant="ghost"
        >
          <Icons.InfinityIcon
            className={cn(
              isAgenticMode
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}
            size={14}
            strokeWidth={2.4}
          />
          <span
            className={cn(
              "ml-[4px] select-none font-medium text-[14px] leading-[16px]",
              isAgenticMode ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Agent
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isAgenticMode ? "Agent mode enabled" : "Enable Agent mode"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
