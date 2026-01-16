"use client";

import { Button } from "@openplane/ui";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SpreadsheetToolbarProps = {
  sheets: string[];
  activeSheet: string;
  onSheetChange: (sheet: string) => void;
  rowCount: number;
  colCount: number;
  visible: boolean;
};

export function SpreadsheetToolbar({
  sheets,
  activeSheet,
  onSheetChange,
  rowCount,
  colCount,
  visible,
}: SpreadsheetToolbarProps) {
  const activeIndex = sheets.indexOf(activeSheet);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < sheets.length - 1;

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
        {sheets.length > 1 && (
          <>
            <SheetNavigation
              activeSheet={activeSheet}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onNext={() => hasNext && onSheetChange(sheets[activeIndex + 1])}
              onPrev={() => hasPrev && onSheetChange(sheets[activeIndex - 1])}
              sheets={sheets}
            />
            <Divider />
          </>
        )}

        <SheetTabs
          activeSheet={activeSheet}
          onSheetChange={onSheetChange}
          sheets={sheets}
        />

        <Divider />

        <div className="flex items-center gap-1 px-2">
          <span className="font-medium text-foreground/60 text-xs tabular-nums">
            {rowCount.toLocaleString()}
          </span>
          <span className="text-foreground/40 text-xs">rows</span>
          <span className="px-0.5 text-foreground/30">×</span>
          <span className="font-medium text-foreground/60 text-xs tabular-nums">
            {colCount}
          </span>
          <span className="text-foreground/40 text-xs">cols</span>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <Separator className="mx-1 h-5 bg-border/60" orientation="vertical" />;
}

type SheetNavigationProps = {
  sheets: string[];
  activeSheet: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

function SheetNavigation({
  sheets,
  activeSheet,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: SheetNavigationProps) {
  const activeIndex = sheets.indexOf(activeSheet);

  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-8 text-foreground/60 hover:text-foreground"
            disabled={!hasPrev}
            onClick={onPrev}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronLeft size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Previous sheet</p>
        </TooltipContent>
      </Tooltip>

      <span className="min-w-12 text-center font-medium text-foreground/60 text-xs tabular-nums">
        {activeIndex + 1} / {sheets.length}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-8 text-foreground/60 hover:text-foreground"
            disabled={!hasNext}
            onClick={onNext}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronRight size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Next sheet</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

type SheetTabsProps = {
  sheets: string[];
  activeSheet: string;
  onSheetChange: (sheet: string) => void;
};

function SheetTabs({ sheets, activeSheet, onSheetChange }: SheetTabsProps) {
  const visibleSheets = sheets.slice(0, 5);
  const hasMore = sheets.length > 5;

  return (
    <div className="flex items-center gap-0.5">
      {visibleSheets.map((sheet) => (
        <Tooltip key={sheet}>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "h-7 max-w-28 truncate px-2.5 text-xs",
                sheet === activeSheet
                  ? "bg-muted text-foreground"
                  : "text-foreground/60 hover:text-foreground"
              )}
              onClick={() => onSheetChange(sheet)}
              variant="ghost"
            >
              {sheet}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p className="text-xs">{sheet}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {hasMore && (
        <span className="px-2 text-foreground/40 text-xs">
          +{sheets.length - 5} more
        </span>
      )}
    </div>
  );
}
