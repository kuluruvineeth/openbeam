"use client";

import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { Icons, Markdown, TextShimmer } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_CONFIG,
  HIDDEN_EVENT_TYPES,
  isActiveEvent,
  resolveTemplate,
} from "../lib/event-config";
import { formatTimelineTimestamp } from "../lib/time-display";
import {
  buildStateSections,
  classifyEventBucket,
  sortEventsByTimestampDesc,
  type TimelineStateBucket,
} from "../lib/timeline-state";

type MissionEventFeedProps = {
  events: MissionEventLedgerItem[];
  missionStatus?: string;
};

type ViewMode = "state" | "chronological";
type EventPriority = "critical" | "high" | "medium" | "low";

type MissionEventRowDisplay = {
  event: MissionEventLedgerItem;
  summary: string;
  active: boolean;
  priority: EventPriority;
  bucket: TimelineStateBucket;
  expandable: boolean;
  hasContent: boolean;
};

const viewToggleVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-1 font-medium text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

const priorityIndicatorVariants = cva("mt-0.5 shrink-0", {
  variants: {
    priority: {
      critical: "text-destructive",
      high: "text-amber-600 dark:text-amber-400",
      medium: "text-muted-foreground",
      low: "text-muted-foreground/60",
    },
  },
  defaultVariants: { priority: "medium" },
});

const rowVariants = cva("border-border/30 border-b border-l-2", {
  variants: {
    bucket: {
      running_now: "border-l-emerald-500/60",
      needs_attention: "border-l-amber-500/70",
      recently_completed: "border-l-primary/40",
      earlier: "border-l-border/40",
    },
  },
  defaultVariants: { bucket: "earlier" },
});

const LIVE_TIMESTAMP_REFRESH_MS = 30_000;
const TERMINAL_MISSION_STATUSES = new Set([
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

function resolvePriority(eventType: string): EventPriority {
  return EVENT_TYPE_CONFIG[eventType]?.priority ?? "medium";
}

function buildSummary(event: MissionEventLedgerItem): string {
  const config = EVENT_TYPE_CONFIG[event.eventType];
  if (!config) {
    return event.summary || event.eventType;
  }

  return resolveTemplate(
    config.summaryTemplate,
    event.payload,
    event.agentName
  );
}

function buildEventDisplayRows(
  events: MissionEventLedgerItem[],
  allEvents: MissionEventLedgerItem[],
  referenceTimestamp: number,
  missionSettled: boolean
): MissionEventRowDisplay[] {
  return events.map((event) => {
    const config = EVENT_TYPE_CONFIG[event.eventType];

    return {
      event,
      summary: buildSummary(event),
      active: missionSettled
        ? false
        : isActiveEvent(event.eventType, allEvents, event.agentName),
      priority: resolvePriority(event.eventType),
      bucket: classifyEventBucket(
        event,
        allEvents,
        referenceTimestamp,
        missionSettled
      ),
      expandable: Boolean(config?.expandable),
      hasContent: Boolean(event.payload?.content),
    };
  });
}

type EventRowProps = {
  row: MissionEventRowDisplay;
  nowMs: number;
};

const EventRow = memo(function EventRowInner({ row, nowMs }: EventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const summaryId = useId();
  const detailsRegionId = useId();
  const config = EVENT_TYPE_CONFIG[row.event.eventType];
  const Icon = config?.icon ?? Icons.Info;
  const canToggle = row.expandable && row.hasContent;
  const timestampDisplay = formatTimelineTimestamp(row.event.timestamp, nowMs);

  const handleClick = useCallback(() => {
    if (canToggle) {
      setExpanded((prev) => !prev);
    }
  }, [canToggle]);

  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      className={rowVariants({ bucket: row.bucket })}
      initial={{ opacity: 0, y: 4 }}
      layout="position"
      transition={{ duration: 0.15 }}
    >
      <button
        aria-controls={canToggle ? detailsRegionId : undefined}
        aria-describedby={summaryId}
        aria-expanded={canToggle ? expanded : undefined}
        className={cn(
          "flex w-full items-start gap-2 px-2 py-1.5 text-left",
          canToggle
            ? "cursor-pointer transition-colors hover:bg-muted/50"
            : "cursor-default"
        )}
        disabled={!canToggle}
        onClick={handleClick}
        type="button"
      >
        <span className={priorityIndicatorVariants({ priority: row.priority })}>
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          {row.active ? (
            <TextShimmer
              as="p"
              className="truncate text-sm"
              duration={1.5}
              id={summaryId}
              spread={1.5}
            >
              {row.summary}
            </TextShimmer>
          ) : (
            <p className="truncate text-sm" id={summaryId}>
              {row.summary}
            </p>
          )}
          <p className="truncate text-muted-foreground text-xs">
            {row.event.agentName ?? "System"}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <time
            className="flex flex-col items-end text-[10px] text-muted-foreground tabular-nums"
            dateTime={timestampDisplay.dateTime}
            title={timestampDisplay.secondary}
          >
            <span className="whitespace-nowrap text-[11px]">
              {timestampDisplay.primary}
            </span>
            <span className="whitespace-nowrap text-muted-foreground/70">
              {timestampDisplay.secondary}
            </span>
          </time>
          {canToggle && (
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              className="text-muted-foreground"
              transition={{ duration: 0.15 }}
            >
              <Icons.ChevronDown size={12} />
            </motion.span>
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && row.hasContent && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            aria-labelledby={summaryId}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={detailsRegionId}
            initial={{ height: 0, opacity: 0 }}
            role="region"
            transition={{ duration: 0.2 }}
          >
            <div className="no-scrollbar max-h-60 overflow-y-auto border-border/20 border-t bg-muted/30 px-3 py-2">
              <Markdown
                content={String(row.event.payload?.content ?? "")}
                showControls={false}
                size="sm"
                variant="compact"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
});

type RowListProps = {
  rows: MissionEventRowDisplay[];
  nowMs: number;
};

function ChronologicalView({ rows, nowMs }: RowListProps) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <EventRow key={row.event.eventId} nowMs={nowMs} row={row} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

function StateView({ rows, nowMs }: RowListProps) {
  const sections = useMemo(() => buildStateSections(rows), [rows]);
  const [collapsedBuckets, setCollapsedBuckets] = useState<
    Set<TimelineStateBucket>
  >(() => new Set(["earlier"]));

  const toggleBucket = useCallback((bucket: TimelineStateBucket) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) {
        next.delete(bucket);
      } else {
        next.add(bucket);
      }
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-3 pb-2">
      {sections
        .filter((section) => section.rows.length > 0)
        .map((section) => {
          const sectionId = `timeline-section-${section.bucket}`;
          const triggerId = `${sectionId}-trigger`;

          return (
            <section key={section.bucket}>
              <button
                aria-controls={sectionId}
                aria-expanded={!collapsedBuckets.has(section.bucket)}
                className="flex w-full items-center gap-2 px-2 py-1 text-left"
                id={triggerId}
                onClick={() => toggleBucket(section.bucket)}
                type="button"
              >
                <Icons.ChevronDown
                  className={cn(
                    "transition-transform",
                    collapsedBuckets.has(section.bucket) && "-rotate-90"
                  )}
                  size={12}
                />
                <span className="font-medium text-xs">{section.label}</span>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
                  {section.rows.length}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {section.description}
                </span>
              </button>
              {!collapsedBuckets.has(section.bucket) && (
                <ul
                  aria-labelledby={triggerId}
                  className="m-0 flex list-none flex-col p-0"
                  id={sectionId}
                >
                  <AnimatePresence initial={false}>
                    {section.rows.map((row) => (
                      <EventRow
                        key={row.event.eventId}
                        nowMs={nowMs}
                        row={row}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>
          );
        })}
    </div>
  );
}

export function MissionEventFeed({
  events,
  missionStatus,
}: MissionEventFeedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("state");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const prevNewestEventRef = useRef<string | null>(null);

  const allSortedEvents = useMemo(
    () => sortEventsByTimestampDesc(events),
    [events]
  );
  const visibleEvents = useMemo(
    () =>
      allSortedEvents.filter(
        (event) => !HIDDEN_EVENT_TYPES.has(event.eventType)
      ),
    [allSortedEvents]
  );
  const missionSettled = missionStatus
    ? TERMINAL_MISSION_STATUSES.has(missionStatus)
    : false;
  const rows = useMemo(
    () =>
      buildEventDisplayRows(
        visibleEvents,
        allSortedEvents,
        nowMs,
        missionSettled
      ),
    [visibleEvents, allSortedEvents, nowMs, missionSettled]
  );
  const sections = useMemo(() => buildStateSections(rows), [rows]);
  const runningCount =
    sections.find((s) => s.bucket === "running_now")?.rows.length ?? 0;
  const attentionCount =
    sections.find((s) => s.bucket === "needs_attention")?.rows.length ?? 0;
  const hasLiveSignal = runningCount > 0 || attentionCount > 0;
  const latestEventTimestamp = rows[0]
    ? formatTimelineTimestamp(rows[0].event.timestamp, nowMs)
    : null;
  const latestEventId = rows[0]?.event.eventId;

  const scrollToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    el.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    setIsAtTop(true);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    setIsAtTop(el.scrollTop < 36);
  }, []);

  useEffect(() => {
    const newestEventId = rows[0]?.event.eventId ?? null;
    if (
      isAtTop &&
      newestEventId &&
      newestEventId !== prevNewestEventRef.current
    ) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevNewestEventRef.current = newestEventId;
  }, [rows, isAtTop]);

  useEffect(() => {
    const syncNow = () => setNowMs(Date.now());
    const intervalId = window.setInterval(syncNow, LIVE_TIMESTAMP_REFRESH_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    window.addEventListener("focus", syncNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!latestEventId) {
      return;
    }

    setNowMs(Date.now());
  }, [latestEventId]);

  useHotkeys("mod+shift+b", scrollToLatest);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between rounded-sm border border-border/50 bg-muted/20 px-2 py-1.5">
        <div className="inline-flex items-center gap-1 rounded-sm bg-background/70 p-0.5">
          <button
            aria-label="Show state-first timeline"
            className={viewToggleVariants({
              active: viewMode === "state",
            })}
            onClick={() => setViewMode("state")}
            title="State-first timeline"
            type="button"
          >
            <Icons.Workflow size={13} />
            State
          </button>
          <button
            aria-label="Show chronological timeline"
            className={viewToggleVariants({
              active: viewMode === "chronological",
            })}
            onClick={() => setViewMode("chronological")}
            title="Chronological timeline"
            type="button"
          >
            <Icons.Clock size={13} />
            Time
          </button>
        </div>

        <button
          aria-label="Jump to latest timeline event"
          className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-default disabled:opacity-40"
          disabled={rows.length === 0 || isAtTop}
          onClick={scrollToLatest}
          type="button"
        >
          <Icons.ChevronDown className="rotate-180" size={10} />
          Jump to latest
        </button>
      </div>

      <div
        className="no-scrollbar relative flex-1 overflow-y-auto"
        onScroll={handleScroll}
        ref={scrollRef}
      >
        {rows.length > 0 && (
          <div className="sticky top-0 z-20 flex items-center gap-2 border-border/50 border-b bg-background/95 px-2 py-1 backdrop-blur-sm">
            {hasLiveSignal ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-medium text-[11px]">Live now</span>
                {runningCount > 0 && (
                  <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600 tabular-nums dark:text-emerald-400">
                    {runningCount} active
                  </span>
                )}
                {attentionCount > 0 && (
                  <span className="rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600 tabular-nums dark:text-amber-400">
                    {attentionCount} need attention
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                <span className="font-medium text-[11px] text-muted-foreground">
                  Settled
                </span>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  No active work
                </span>
              </>
            )}
            {latestEventTimestamp && (
              <time
                className="ml-auto text-[10px] text-muted-foreground tabular-nums"
                dateTime={latestEventTimestamp.dateTime}
                title={latestEventTimestamp.secondary}
              >
                Latest {latestEventTimestamp.primary}
              </time>
            )}
          </div>
        )}

        {viewMode === "state" ? (
          <StateView nowMs={nowMs} rows={rows} />
        ) : (
          <ChronologicalView nowMs={nowMs} rows={rows} />
        )}

        {rows.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No events
          </div>
        )}
      </div>
    </div>
  );
}
