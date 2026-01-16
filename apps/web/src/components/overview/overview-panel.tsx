"use client";

import { Button } from "@openplane/ui";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { SearchPreviewSheet } from "@/components/search/search-preview-sheet";
import { ThinkingDemo } from "@/components/thinking";
import type { PreviewType } from "@/hooks/use-document-preview";
import type {
  OverviewCitation,
  OverviewStep,
  ThinkingState,
} from "@/lib/overview-types";
import { cn } from "@/lib/utils";
import { OverviewCitations } from "./overview-citations";
import { OverviewContent } from "./overview-content";
import { OverviewSkeleton } from "./overview-skeleton";
import { OverviewThinking } from "./overview-thinking";

function getPreviewTypeFromCitation(citation: OverviewCitation): PreviewType {
  if (citation.sourceType === "media") {
    return "media";
  }

  const connector = (citation.connectorType ?? "").toLowerCase();
  if (connector === "slack") {
    return "slack";
  }
  if (connector === "gmail") {
    return "email";
  }
  if (connector === "notion") {
    return "notion";
  }

  return "document";
}

type OverviewPanelProps = {
  content: string;
  citations: OverviewCitation[];
  isLoading: boolean;
  isStreaming: boolean;
  error?: string | null;
  groundingScore?: number | null;
  steps: OverviewStep[];
  thinkingMessage?: string | null;
  statusMessage?: string | null;
  thinking: ThinkingState;
  className?: string;
};

function OverviewPanelInner({
  content,
  citations,
  isLoading,
  isStreaming,
  error,
  groundingScore,
  steps,
  thinkingMessage,
  statusMessage,
  thinking,
  className,
}: OverviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType | null>(null);

  const handlePreviewCitation = useCallback((citation: OverviewCitation) => {
    setPreviewId(citation.documentId);
    setPreviewType(getPreviewTypeFromCitation(citation));
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewId(null);
    setPreviewType(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCollapsed) {
        setIsCollapsed(true);
      }
    },
    [isCollapsed]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (isCollapsed) {
    return (
      <motion.div
        animate={{ opacity: 1, height: "auto" }}
        className={cn("mb-4", className)}
        exit={{ opacity: 0, height: 0 }}
        initial={{ opacity: 0, height: 0 }}
      >
        <Button
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setIsCollapsed(false)}
          size="sm"
          variant="ghost"
        >
          <Icons.SparklesIcon size={14} />
          <span>Show AI Overview</span>
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mb-6 rounded-md border border-border/50 bg-background-100/50 p-4",
          className
        )}
        exit={{ opacity: 0, y: -10 }}
        initial={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.SparklesIcon className="text-primary" size={16} />
            <h3 className="font-medium text-foreground text-sm">AI Overview</h3>
            {groundingScore !== null && groundingScore !== undefined && (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {Math.round(groundingScore * 100)}% grounded
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label={isExpanded ? "Collapse overview" : "Expand overview"}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded((prev) => !prev)}
              size="icon"
              title={isExpanded ? "Collapse" : "Expand"}
              variant="ghost"
            >
              {isExpanded ? (
                <Icons.ChevronUp size={14} />
              ) : (
                <Icons.ChevronDown size={14} />
              )}
            </Button>
            <Button
              aria-label="Hide overview"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setIsCollapsed(true)}
              size="icon"
              title="Hide overview (Esc)"
              variant="ghost"
            >
              <Icons.Close size={14} />
            </Button>
          </div>
        </header>

        <ThinkingDemo mode="animated" />

        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              {isLoading && !content && !isStreaming && (
                <OverviewSkeleton className="mb-3" />
              )}

              {isStreaming && !content && (
                <OverviewThinking
                  className="mb-3"
                  statusMessage={statusMessage}
                  steps={steps}
                  thinking={thinking}
                  thinkingMessage={thinkingMessage}
                />
              )}

              {error && (
                <div className="mb-3 rounded-sm bg-destructive/10 p-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              {content && (
                <OverviewContent
                  citations={citations}
                  className="mb-4"
                  content={content}
                  isStreaming={isStreaming}
                  onCitationClick={handlePreviewCitation}
                />
              )}

              {citations.length > 0 && (
                <div className="border-border/50 border-t pt-3">
                  <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Sources
                  </div>
                  <OverviewCitations
                    citations={citations}
                    onPreviewCitation={handlePreviewCitation}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <SearchPreviewSheet
        onClose={handleClosePreview}
        previewId={previewId}
        previewType={previewType}
      />
    </AnimatePresence>
  );
}

export const OverviewPanel = memo(OverviewPanelInner);
OverviewPanel.displayName = "OverviewPanel";
