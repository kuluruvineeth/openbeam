"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DocxToolbarProps = {
  currentPage: number;
  totalPages: number;
  visible: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onDownload: () => void;
};

export function DocxToolbar({
  currentPage,
  totalPages,
  visible,
  onPrevPage,
  onNextPage,
  onDownload,
}: DocxToolbarProps) {
  return (
    <div
      className={cn(
        "-translate-x-1/2 absolute bottom-6 left-1/2 z-30 transition-all duration-300 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <div className="flex items-center gap-1 border border-border/40 bg-background/80 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        {totalPages > 1 && (
          <>
            <PageNavigation
              currentPage={currentPage}
              onNextPage={onNextPage}
              onPrevPage={onPrevPage}
              totalPages={totalPages}
            />
            <Divider />
          </>
        )}

        <div className="flex items-center gap-1 px-1">
          <span className="font-medium text-foreground/60 text-xs tabular-nums">
            {totalPages}
          </span>
          <span className="text-foreground/40 text-xs">
            {totalPages === 1 ? "page" : "pages"}
          </span>
        </div>

        <Divider />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-8 text-foreground/60 hover:text-foreground"
              onClick={onDownload}
              size="icon"
              variant="ghost"
            >
              <Icons.ExternalLink size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p className="text-xs">Download</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function Divider() {
  return <Separator className="mx-1 h-5 bg-border/60" orientation="vertical" />;
}

type PageNavigationProps = {
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
};

function PageNavigation({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
}: PageNavigationProps) {
  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-8 text-foreground/60 hover:text-foreground"
            disabled={currentPage <= 1}
            onClick={onPrevPage}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronLeft size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Previous page</p>
        </TooltipContent>
      </Tooltip>

      <span className="min-w-12 text-center font-medium text-foreground/60 text-xs tabular-nums">
        {currentPage} / {totalPages}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-8 text-foreground/60 hover:text-foreground"
            disabled={currentPage >= totalPages}
            onClick={onNextPage}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronRight size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Next page</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
