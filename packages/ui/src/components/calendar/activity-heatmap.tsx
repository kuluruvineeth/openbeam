"use client";

import {
  eachDayOfInterval,
  format,
  getDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { useMemo } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

interface ActivityData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
  weeks?: number;
  colorScale?: string[];
  className?: string;
}

interface DayData {
  date: Date;
  dateStr: string;
  count: number;
  dayOfWeek: number;
}

const DEFAULT_COLOR_SCALE = [
  "hsl(var(--muted))",
  "hsl(142, 76%, 80%)",
  "hsl(142, 76%, 60%)",
  "hsl(142, 76%, 40%)",
  "hsl(142, 76%, 30%)",
];

function ActivityHeatmap({
  data,
  weeks = 52,
  colorScale = DEFAULT_COLOR_SCALE,
  className,
}: ActivityHeatmapProps) {
  const { days, maxCount } = useMemo(() => {
    const endDate = new Date();
    const startDate = startOfWeek(subDays(endDate, weeks * 7), {
      weekStartsOn: 0,
    });
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const dataMap = new Map(data.map((d) => [d.date, d.count]));
    const max = Math.max(...data.map((d) => d.count), 1);

    return {
      days: allDays.map((date) => ({
        date,
        dateStr: format(date, "yyyy-MM-dd"),
        count: dataMap.get(format(date, "yyyy-MM-dd")) || 0,
        dayOfWeek: getDay(date),
      })),
      maxCount: max,
    };
  }, [data, weeks]);

  const getColor = (count: number) => {
    if (count === 0) {
      return colorScale[0];
    }
    const index = Math.min(
      Math.ceil((count / maxCount) * (colorScale.length - 1)),
      colorScale.length - 1
    );
    return colorScale[index];
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeksArray = useMemo(() => {
    const result: (DayData | null)[][] = [];
    const totalWeeks = Math.ceil(days.length / 7);
    for (let w = 0; w < totalWeeks; w++) {
      const week: (DayData | null)[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(days[w * 7 + d] || null);
      }
      result.push(week);
    }
    return result;
  }, [days]);

  return (
    <TooltipProvider>
      <div className={className}>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pr-1 text-[10px] text-muted-foreground">
            {weekDays.map((day, i) => (
              <div className="flex h-3 items-center" key={day}>
                {i % 2 === 1 && day}
              </div>
            ))}
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {weeksArray.map((week, weekIdx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Week position is stable in grid
              <div className="flex flex-col gap-1" key={`week-${weekIdx}`}>
                {week.map((day, dayIdx) => {
                  const cellPosition = weekIdx * 7 + dayIdx;

                  if (!day) {
                    return (
                      <div className="h-3 w-3" key={`empty-${cellPosition}`} />
                    );
                  }

                  return (
                    <Tooltip key={day.dateStr}>
                      <TooltipTrigger asChild>
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: getColor(day.count) }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">
                          {day.count}{" "}
                          {day.count === 1 ? "execution" : "executions"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {format(day.date, "MMMM d, yyyy")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export { ActivityHeatmap };
export type { ActivityData, ActivityHeatmapProps };
