import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@openplane/ui";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type PdfToolbarProps = {
  currentPage: number;
  numPages: number | null;
  scale: number;
  visible: boolean;
  hasHighlight: boolean;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

export function PdfToolbar({
  currentPage,
  numPages,
  scale,
  visible,
  hasHighlight,
  onPageChange,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  canZoomIn,
  canZoomOut,
}: PdfToolbarProps) {
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
        <PageNavigation
          currentPage={currentPage}
          numPages={numPages}
          onNextPage={onNextPage}
          onPageChange={onPageChange}
          onPrevPage={onPrevPage}
        />

        <Divider />

        <ZoomControls
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
          scale={scale}
        />

        {hasHighlight && (
          <>
            <Divider />
            <HighlightIndicator />
          </>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <Separator className="mx-1 h-5 bg-border/60" orientation="vertical" />;
}

function HighlightIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-2">
      <div className="size-2 animate-pulse rounded-full bg-amber-400" />
      <span className="font-medium text-amber-600 text-xs dark:text-amber-400">
        Match
      </span>
    </div>
  );
}

type PageNavigationProps = {
  currentPage: number;
  numPages: number | null;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

function PageNavigation({
  currentPage,
  numPages,
  onPageChange,
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
          <p className="text-xs">Previous</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-1 px-1">
        <input
          className="h-7 w-12 rounded-md border-0 bg-muted/50 px-1 text-center font-medium text-xs tabular-nums focus:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
          max={numPages ?? 1}
          min={1}
          onChange={(e) => {
            const page = Number.parseInt(e.target.value, 10);
            if (page >= 1 && page <= (numPages ?? 1)) {
              onPageChange(page);
            }
          }}
          type="number"
          value={currentPage}
        />
        <span className="text-foreground/40 text-xs">/</span>
        <span className="min-w-6 text-center font-medium text-foreground/60 text-xs tabular-nums">
          {numPages ?? "–"}
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-8 text-foreground/60 hover:text-foreground"
            disabled={!numPages || currentPage >= numPages}
            onClick={onNextPage}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronRight size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Next</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

type ZoomControlsProps = {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  canZoomIn,
  canZoomOut,
}: ZoomControlsProps) {
  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-8 text-foreground/60 hover:text-foreground"
            disabled={!canZoomOut}
            onClick={onZoomOut}
            size="icon"
            variant="ghost"
          >
            <Icons.Minus size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Zoom out</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="h-8 min-w-14 px-2 font-medium text-foreground/70 text-xs tabular-nums hover:text-foreground"
            onClick={onZoomReset}
            variant="ghost"
          >
            {Math.round(scale * 100)}%
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Reset</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-8 text-foreground/60 hover:text-foreground"
            disabled={!canZoomIn}
            onClick={onZoomIn}
            size="icon"
            variant="ghost"
          >
            <Icons.Plus size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <p className="text-xs">Zoom in</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
