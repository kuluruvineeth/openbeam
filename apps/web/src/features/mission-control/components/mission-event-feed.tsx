"use client";

import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { Icons, TextShimmer } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  EVENT_TYPE_CONFIG,
  HIDDEN_EVENT_TYPES,
  isActiveEvent,
  resolveTemplate,
} from "../lib/event-config";

type MissionEventFeedProps = {
  events: MissionEventLedgerItem[];
};

type ViewMode = "chronological" | "grouped";

const FILTER_CHIPS = [
  "mission",
  "run",
  "task",
  "tool",
  "approval",
  "artifact",
  "budget",
];

const filterChipVariants = cva(
  "rounded-sm px-2 py-0.5 text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted",
      },
    },
    defaultVariants: { active: false },
  }
);

const viewToggleVariants = cva("rounded-sm p-1 transition-colors", {
  variants: {
    active: {
      true: "bg-accent text-accent-foreground",
      false: "text-muted-foreground hover:bg-muted",
    },
  },
  defaultVariants: { active: false },
});

const priorityIndicatorVariants = cva("mt-0.5", {
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type EventRowProps = {
  event: MissionEventLedgerItem;
  active: boolean;
};

const EventRow = memo(function EventRowInner({ event, active }: EventRowProps) {
  const config = EVENT_TYPE_CONFIG[event.eventType];
  const Icon = config?.icon ?? Icons.Info;
  const priority = config?.priority ?? "medium";

  const summary = config
    ? resolveTemplate(config.summaryTemplate, event.payload, event.agentName)
    : event.summary || event.eventType;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 border-border/30 border-b px-1 py-1.5"
      initial={{ opacity: 0, y: 4 }}
      layout
      transition={{ duration: 0.15 }}
    >
      <span className={priorityIndicatorVariants({ priority })}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        {active ? (
          <TextShimmer
            as="p"
            className="truncate text-sm"
            duration={1.5}
            spread={1.5}
          >
            {summary}
          </TextShimmer>
        ) : (
          <p className="truncate text-sm">{summary}</p>
        )}
        {event.agentName && (
          <span className="text-muted-foreground text-xs">
            {event.agentName}
          </span>
        )}
      </div>
      <span className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
        {formatTime(event.timestamp)}
      </span>
    </motion.div>
  );
});

function groupByAgent(
  events: MissionEventLedgerItem[]
): Map<string, MissionEventLedgerItem[]> {
  const groups = new Map<string, MissionEventLedgerItem[]>();
  for (const event of events) {
    const key = event.agentName ?? "system";
    const group = groups.get(key);
    if (group) {
      group.push(event);
    } else {
      groups.set(key, [event]);
    }
  }
  return groups;
}

export function MissionEventFeed({ events }: MissionEventFeedProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chronological");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevEventCountRef = useRef(events.length);

  const visibleEvents = useMemo(() => {
    let result = events.filter((e) => !HIDDEN_EVENT_TYPES.has(e.eventType));
    if (filter) {
      result = result.filter((e) => e.eventType.startsWith(filter));
    }
    return result;
  }, [events, filter]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const threshold = 40;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  useEffect(() => {
    if (isAtBottom && events.length > prevEventCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevEventCountRef.current = events.length;
  }, [events.length, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
  }, []);

  useHotkeys("mod+shift+b", scrollToBottom);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            className={filterChipVariants({ active: !filter })}
            onClick={() => setFilter(null)}
            type="button"
          >
            All
          </button>
          {FILTER_CHIPS.map((chip) => (
            <button
              className={filterChipVariants({ active: filter === chip })}
              key={chip}
              onClick={() => setFilter(filter === chip ? null : chip)}
              type="button"
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            className={viewToggleVariants({
              active: viewMode === "chronological",
            })}
            onClick={() => setViewMode("chronological")}
            title="Chronological"
            type="button"
          >
            <Icons.Clock size={14} />
          </button>
          <button
            className={viewToggleVariants({
              active: viewMode === "grouped",
            })}
            onClick={() => setViewMode("grouped")}
            title="Grouped by agent"
            type="button"
          >
            <Icons.Users size={14} />
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-y-auto"
        onScroll={handleScroll}
        ref={scrollRef}
        role="log"
      >
        {viewMode === "chronological" ? (
          <ChronologicalView allEvents={events} events={visibleEvents} />
        ) : (
          <GroupedView allEvents={events} events={visibleEvents} />
        )}
        {visibleEvents.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No events
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {!isAtBottom && visibleEvents.length > 0 && (
          <motion.button
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-4 bottom-4 rounded-sm border border-border/50 bg-background p-1.5 shadow-sm transition-colors hover:bg-muted"
            exit={{ opacity: 0, scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.9 }}
            onClick={scrollToBottom}
            type="button"
          >
            <Icons.ChevronDown size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

type ViewProps = {
  events: MissionEventLedgerItem[];
  allEvents: MissionEventLedgerItem[];
};

function ChronologicalView({ events, allEvents }: ViewProps) {
  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {events.map((event) => (
          <EventRow
            active={isActiveEvent(event.eventType, allEvents)}
            event={event}
            key={event.eventId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function GroupedView({ events, allEvents }: ViewProps) {
  const groups = useMemo(() => groupByAgent(events), [events]);

  return (
    <div className="flex flex-col gap-3">
      {Array.from(groups.entries()).map(([agentName, agentEvents]) => (
        <div key={agentName}>
          <div className="sticky top-0 z-10 bg-background/95 px-1 py-1 backdrop-blur-sm">
            <span className="font-medium text-xs">{agentName}</span>
            <span className="ml-1.5 text-muted-foreground text-xs tabular-nums">
              ({agentEvents.length})
            </span>
          </div>
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {agentEvents.map((event) => (
                <EventRow
                  active={isActiveEvent(event.eventType, allEvents)}
                  event={event}
                  key={event.eventId}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
