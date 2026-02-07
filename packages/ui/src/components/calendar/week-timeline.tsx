"use client";

import {
  addWeeks,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  set,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { useMemo, useRef } from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";

interface TimelineEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
}

interface WeekTimelineProps {
  events?: TimelineEvent[];
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: TimelineEvent) => void;
  hourStart?: number;
  hourEnd?: number;
  className?: string;
}

function WeekTimeline({
  events = [],
  currentDate,
  onDateChange,
  onEventClick,
  hourStart = 8,
  hourEnd = 20,
  className,
}: WeekTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = useMemo(
    () =>
      eachHourOfInterval({
        start: set(currentDate, { hours: hourStart, minutes: 0 }),
        end: set(currentDate, { hours: hourEnd, minutes: 0 }),
      }),
    [currentDate, hourStart, hourEnd]
  );

  const hourHeight = 60;

  const getEventPosition = (event: TimelineEvent) => {
    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
    const endHour = event.end.getHours() + event.end.getMinutes() / 60;
    const top = (startHour - hourStart) * hourHeight;
    const height = (endHour - startHour) * hourHeight;
    return { top: Math.max(0, top), height: Math.max(20, height) };
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-lg">
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onDateChange?.(subWeeks(currentDate, 1))}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onDateChange?.(new Date())}
            size="sm"
            variant="ghost"
          >
            Today
          </Button>
          <Button
            onClick={() => onDateChange?.(addWeeks(currentDate, 1))}
            size="icon"
            variant="ghost"
          >
            <Icons.ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div className="grid min-w-[800px] grid-cols-8">
          <div className="col-span-1" />
          {days.map((day) => (
            <div
              className={cn(
                "border-border border-b py-2 text-center",
                isToday(day) && "bg-primary/5"
              )}
              key={day.toISOString()}
            >
              <div className="text-muted-foreground text-xs">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "font-medium text-lg",
                  isToday(day) && "text-primary"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}

          <div className="relative col-span-1">
            {hours.map((hour) => (
              <div
                className="-mt-2 h-[60px] pr-2 text-right text-muted-foreground text-xs"
                key={hour.toISOString()}
              >
                {format(hour, "h a")}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = events.filter((e) => isSameDay(e.start, day));

            return (
              <div
                className={cn(
                  "relative border-border border-l",
                  isToday(day) && "bg-primary/5"
                )}
                key={day.toISOString()}
              >
                {hours.map((hour) => (
                  <div
                    className="h-[60px] border-border/50 border-b"
                    key={hour.toISOString()}
                  />
                ))}

                {dayEvents.map((event) => {
                  const { top, height } = getEventPosition(event);
                  return (
                    <button
                      className={cn(
                        "absolute right-1 left-1 rounded-md px-2 py-1",
                        "overflow-hidden font-medium text-white text-xs",
                        "transition-opacity hover:opacity-90"
                      )}
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      style={{
                        top,
                        height,
                        backgroundColor: event.color || "hsl(var(--primary))",
                      }}
                      type="button"
                    >
                      <div className="truncate">{event.title}</div>
                      <div className="text-[10px] opacity-80">
                        {format(event.start, "h:mm a")}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { WeekTimeline };
export type { TimelineEvent, WeekTimelineProps };
