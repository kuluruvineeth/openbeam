"use client";

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openplane/ui";
import { Icons } from "@/components/icons";

type EmailPreviewHeaderProps = {
  subject: string;
  messageCount: number;
  url?: string;
  onClose: () => void;
};

export function EmailPreviewHeader({
  subject,
  messageCount,
  url,
  onClose,
}: EmailPreviewHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-border/50 border-b px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center bg-muted">
        <Icons.Mail className="size-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground text-sm">
          {subject}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {messageCount} {messageCount === 1 ? "message" : "messages"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {url && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="size-8"
                  onClick={() =>
                    window.open(url, "_blank", "noopener,noreferrer")
                  }
                  size="icon"
                  variant="ghost"
                >
                  <Icons.ExternalLink className="size-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Open in Gmail</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-8"
                onClick={onClose}
                size="icon"
                variant="ghost"
              >
                <Icons.Close className="size-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                Close <kbd className="ml-1 text-[10px] opacity-50">Esc</kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
