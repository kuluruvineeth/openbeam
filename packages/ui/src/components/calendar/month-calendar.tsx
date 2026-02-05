"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  color?: string;
  count?: number;
}

interface MonthCalendarProps {
  events?: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  renderDay?: (date: Date, events: CalendarEvent[]) => React.ReactNode;
  className?: string;
}

function MonthCalendar({
  events = [],
  selectedDate,
  onDateSelect,
  onMonthChange,
  renderDay,
  className,
}: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(event.date, "yyyy-MM-dd");
      const existing = map.get(key) || [];
      map.set(key, [...existing, event]);
    }
    return map;
  }, [events]);

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth =
      direction === "prev"
        ? subMonths(currentMonth, 1)
        : addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => navigateMonth("prev")}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              setCurrentMonth(new Date());
              onMonthChange?.(new Date());
            }}
            size="sm"
            variant="ghost"
          >
            Today
          </Button>
          <Button
            onClick={() => navigateMonth("next")}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
        {weekDays.map((day) => (
          <div
            className="bg-muted px-2 py-2 text-center font-medium text-muted-foreground text-xs"
            key={day}
          >
            {day}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              className={cn(
                "min-h-24 bg-card p-2 text-left transition-colors hover:bg-muted/50",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isSelected && "ring-2 ring-primary ring-inset"
              )}
              key={dateKey}
              onClick={() => onDateSelect?.(day)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                    today && "bg-primary font-medium text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {renderDay ? (
                renderDay(day, dayEvents)
              ) : (
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      className="truncate rounded px-1.5 py-0.5 text-xs"
                      key={event.id}
                      style={{
                        backgroundColor: event.color || "hsl(var(--muted))",
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="px-1.5 text-muted-foreground text-xs">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { MonthCalendar };
export type { CalendarEvent, MonthCalendarProps };
