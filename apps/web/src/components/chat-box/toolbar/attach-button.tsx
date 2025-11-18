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
  canAttach: boolean;
  onAttachClick?: () => void;
};

export function AttachButton({ canAttach, onAttachClick }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "transition-colors",
            canAttach
              ? "cursor-pointer text-muted-foreground hover:text-foreground"
              : "cursor-not-allowed text-muted-foreground opacity-50"
          )}
          disabled={!canAttach}
          onClick={onAttachClick}
          variant="ghost"
        >
          <Icons.FileIcon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{canAttach ? "Attach files" : "Maximum attachments reached"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
