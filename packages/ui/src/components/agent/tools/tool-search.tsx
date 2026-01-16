"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  ChevronDown,
  Circle,
  ExternalLink,
  File,
  FileSearch,
  FolderSearch,
  Search,
} from "lucide-react";
import { forwardRef, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../../lib/agent-constants";
import { cn } from "../../../utils/cn";
import { Button } from "../../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import { TextShimmer } from "../../text-shimmer";

const toolSearchVariants = cva("rounded-md border text-sm", {
  variants: {
    status: {
      pending: "border-border/50 bg-muted/30",
      running: "border-primary/30 bg-muted/30",
      success: "border-border/50 bg-muted/30",
      error: "border-destructive/30 bg-destructive/5",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

type ToolSearchStatus = "pending" | "running" | "success" | "error";

interface SearchResult {
  path: string;
  lineNumber?: number;
  matchText?: string;
  type?: "file" | "directory" | "match";
}

type ToolSearchProps = React.ComponentProps<"div"> &
  VariantProps<typeof toolSearchVariants> & {
    query?: string;
    pattern?: string;
    results: SearchResult[];
    status?: ToolSearchStatus;
    searchType?: "grep" | "glob" | "hybrid";
    defaultExpanded?: boolean;
    maxVisibleResults?: number;
  };

const ToolSearch = forwardRef<HTMLDivElement, ToolSearchProps>(
  (
    {
      className,
      query,
      pattern,
      results,
      status = "pending",
      searchType = "grep",
      defaultExpanded = false,
      maxVisibleResults = AGENT_UI_CONSTANTS.MAX_VISIBLE_TOOLS,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const totalResults = results.length;
    const hasMoreResults = totalResults > maxVisibleResults;
    const visibleResults =
      hasMoreResults && !isOpen ? results.slice(0, maxVisibleResults) : results;

    const renderStatusIndicator = () => {
      if (status === "running") {
        return (
          <Circle className="size-2 animate-pulse fill-primary text-primary" />
        );
      }
      if (status === "success") {
        return <Circle className="size-2 fill-green-500 text-green-500" />;
      }
      if (status === "error") {
        return <Circle className="size-2 fill-destructive text-destructive" />;
      }
      return (
        <Circle className="size-2 fill-muted-foreground/50 text-muted-foreground/50" />
      );
    };

    const getSearchIcon = () => {
      if (searchType === "glob") {
        return FolderSearch;
      }
      if (searchType === "grep") {
        return FileSearch;
      }
      return Search;
    };

    const SearchIcon = getSearchIcon();

    const renderHeader = () => (
      <div className="flex items-center gap-2 border-border/30 border-b px-3 py-2">
        <SearchIcon className="size-3.5 text-muted-foreground" />
        {status === "running" ? (
          <TextShimmer as="span" className="font-medium text-xs" duration={1.5}>
            Searching...
          </TextShimmer>
        ) : (
          <span className="flex-1 truncate text-muted-foreground text-xs">
            {query ?? pattern ?? "Search"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {totalResults} {totalResults === 1 ? "result" : "results"}
          </span>
          {renderStatusIndicator()}
        </div>
      </div>
    );

    const renderResult = (result: SearchResult, index: number) => {
      const fileName = result.path.split("/").pop() ?? result.path;
      const isMatch = result.type === "match" || result.lineNumber != null;

      return (
        <div
          className="group flex items-start gap-2 px-3 py-1.5 transition-colors hover:bg-muted/50"
          key={`${result.path}-${result.lineNumber}-${index}`}
        >
          <File className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span
                className="truncate text-foreground text-xs"
                title={result.path}
              >
                {fileName}
              </span>
              {result.lineNumber != null && (
                <span className="text-primary text-xs tabular-nums">
                  :{result.lineNumber}
                </span>
              )}
            </div>
            {isMatch && result.matchText && (
              <pre className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
                {result.matchText}
              </pre>
            )}
          </div>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      );
    };

    if (totalResults === 0) {
      return (
        <div
          className={cn(toolSearchVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          <div className="px-3 py-4 text-center text-muted-foreground text-xs">
            No results found
          </div>
        </div>
      );
    }

    if (!hasMoreResults) {
      return (
        <div
          className={cn(toolSearchVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          <div className="py-1">
            {results.map((result, i) => renderResult(result, i))}
          </div>
        </div>
      );
    }

    return (
      <Collapsible asChild onOpenChange={setIsOpen} open={isOpen}>
        <div
          className={cn(toolSearchVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          {!isOpen && (
            <div className="py-1">
              {visibleResults.map((result, i) => renderResult(result, i))}
            </div>
          )}
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="py-1">
              {results.map((result, i) => renderResult(result, i))}
            </div>
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button
              className="h-7 w-full rounded-none rounded-b-md border-border/30 border-t text-muted-foreground hover:text-foreground"
              size="sm"
              variant="ghost"
            >
              <span className="text-xs">
                {isOpen ? "Show less" : `Show all ${totalResults} results`}
              </span>
              <ChevronDown
                className={cn(
                  "ml-1 size-3 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
      </Collapsible>
    );
  }
);
ToolSearch.displayName = "ToolSearch";

export { ToolSearch, toolSearchVariants };
export type { ToolSearchProps, ToolSearchStatus, SearchResult };
