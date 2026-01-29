"use client";

import { Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@openplane/ui/components/tooltip";
import { cn } from "@openplane/ui/utils";

interface AgentSendButtonProps {
  isStreaming?: boolean;
  isSubmitting?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onStop?: () => void;
  className?: string;
}

export function AgentSendButton({
  isStreaming = false,
  isSubmitting = false,
  disabled = false,
  onClick,
  onStop,
  className,
}: AgentSendButtonProps) {
  const handleClick = () => {
    if (isStreaming) {
      onStop?.();
    } else {
      onClick();
    }
  };

  const getIcon = () => {
    if (isStreaming) {
      return <div className="h-3 w-3 rounded-[2px] bg-current" />;
    }
    if (isSubmitting) {
      return <Icons.Spinner className="animate-spin" size={16} />;
    }
    return <Icons.ChevronUp size={16} />;
  };

  const getTooltipContent = () => {
    if (isStreaming) {
      return (
        <span className="flex items-center gap-1.5">
          Stop{" "}
          <kbd className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px]">
            Esc
          </kbd>
        </span>
      );
    }
    if (isSubmitting) {
      return "Generating...";
    }
    return (
      <span className="flex items-center gap-1.5">
        Send{" "}
        <kbd className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px]">↵</kbd>
      </span>
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "h-8 w-8 rounded-sm transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            disabled && !isStreaming && "opacity-50",
            className
          )}
          disabled={disabled && !isStreaming}
          onClick={handleClick}
          size="icon"
          variant="ghost"
        >
          {getIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs" side="top">
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  );
}
