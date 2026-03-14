"use client";

import { Markdown, Sheet, SheetContent } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { fetchPublicDocument } from "../lib/api";
import { SOURCE_COLORS, SOURCE_LABELS } from "../lib/constants";

type PublicDetailSheetProps = {
  documentId: string | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(timestamp: number): string {
  return DATE_FORMATTER.format(new Date(timestamp));
}

function DatasetBadge({ dataset }: { dataset: string }) {
  const colors = SOURCE_COLORS[dataset];
  const label = SOURCE_LABELS[dataset] ?? dataset;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        colors?.bg,
        colors?.text,
        colors?.border ?? "border-border/50"
      )}
    >
      {label}
    </span>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-foreground text-sm">{value}</dd>
    </div>
  );
}

export function PublicDetailSheet({
  documentId,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: PublicDetailSheetProps) {
  const isOpen = documentId !== null;

  const { data: doc, isLoading } = useQuery({
    queryKey: ["public-document", documentId],
    queryFn: () => fetchPublicDocument(documentId ?? ""),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  useHotkeys("left", onPrev, { enabled: isOpen && hasPrev });
  useHotkeys("right", onNext, { enabled: isOpen && hasNext });

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetContent
        className="w-full overflow-hidden p-0 sm:max-w-2xl"
        hideClose
        side="right"
      >
        <div className="flex h-full flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-border/50 border-b bg-background px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {doc && <DatasetBadge dataset={doc.dataset} />}
              {isLoading && !doc ? (
                <div className="h-4 w-48 animate-pulse rounded-sm bg-muted" />
              ) : (
                <h2 className="truncate font-medium text-foreground text-sm">
                  {doc?.title}
                </h2>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label="Previous result"
                className={cn(
                  "rounded-sm p-1 transition-colors",
                  hasPrev
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/30"
                )}
                disabled={!hasPrev}
                onClick={onPrev}
                type="button"
              >
                <Icons.ChevronLeft size={14} />
              </button>
              <button
                aria-label="Next result"
                className={cn(
                  "rounded-sm p-1 transition-colors",
                  hasNext
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/30"
                )}
                disabled={!hasNext}
                onClick={onNext}
                type="button"
              >
                <Icons.ChevronRight size={14} />
              </button>
              <button
                aria-label="Close"
                className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
                onClick={onClose}
                type="button"
              >
                <Icons.Close size={14} />
              </button>
            </div>
          </header>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
            {isLoading && <DetailSkeleton />}
            {doc && (
              <div className="px-5 py-4">
                <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3 border-border/50 border-b pb-5 sm:grid-cols-3">
                  <MetadataItem label="Type" value={doc.documentType} />
                  <MetadataItem
                    label="Published"
                    value={formatDate(doc.createdAt)}
                  />
                  <MetadataItem
                    label="Updated"
                    value={formatDate(doc.updatedAt)}
                  />
                </dl>

                <Markdown
                  className="text-foreground/80"
                  content={doc.content}
                  size="md"
                  variant="compact"
                />

                {doc.url && (
                  <div className="mt-6 border-border/50 border-t pt-4">
                    <div className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                      Source
                    </div>
                    <a
                      className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
                      href={doc.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Icons.ExternalLink size={12} />
                      {doc.url}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse px-5 py-4">
      <div className="mb-5 grid grid-cols-3 gap-6 border-border/50 border-b pb-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div className="space-y-1.5" key={i}>
            <div className="h-2.5 w-12 rounded-sm bg-muted" />
            <div className="h-4 w-20 rounded-sm bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded-sm bg-muted" />
        <div className="h-4 w-5/6 rounded-sm bg-muted" />
        <div className="h-4 w-4/6 rounded-sm bg-muted" />
        <div className="h-4 w-full rounded-sm bg-muted" />
        <div className="h-4 w-3/4 rounded-sm bg-muted" />
      </div>
    </div>
  );
}
