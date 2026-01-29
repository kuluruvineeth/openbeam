"use client";

import { memo, useMemo } from "react";
import { cn } from "../utils/cn";
import { Icons } from "./icons";

interface CronDisplayProps {
  expression: string;
  className?: string;
  showExpression?: boolean;
}

const WHITESPACE_REGEX = /\s+/;

const COMMON_CRONS: Record<string, string> = {
  "* * * * *": "Every minute",
  "*/5 * * * *": "Every 5 minutes",
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *": "Every hour",
  "0 */2 * * *": "Every 2 hours",
  "0 */6 * * *": "Every 6 hours",
  "0 */12 * * *": "Every 12 hours",
  "0 0 * * *": "Every day at midnight",
  "0 9 * * *": "Every day at 9:00 AM",
  "0 0 * * 0": "Every Sunday at midnight",
  "0 0 * * 1": "Every Monday at midnight",
  "0 0 1 * *": "First day of every month",
  "0 0 1 1 *": "Every year on January 1st",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatHour(h: number): number {
  if (h === 0) {
    return 12;
  }
  if (h > 12) {
    return h - 12;
  }
  return h;
}

function formatTime(hour: string, minute: string): string {
  const h = Number.parseInt(hour, 10);
  const m = Number.parseInt(minute, 10);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = formatHour(h);
  return `At ${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatHourOnly(hour: string): string {
  const h = Number.parseInt(hour, 10);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = formatHour(h);
  return `At ${displayHour}:00 ${period}`;
}

function parseTimeDescription(minute: string, hour: string): string | null {
  if (minute === "*" && hour === "*") {
    return "Every minute";
  }
  if (minute.startsWith("*/")) {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (hour.startsWith("*/")) {
    return `Every ${hour.slice(2)} hours`;
  }
  if (minute !== "*" && hour !== "*") {
    return formatTime(hour, minute);
  }
  if (hour !== "*") {
    return formatHourOnly(hour);
  }
  return null;
}

function parseDayOfWeek(dayOfWeek: string): string | null {
  if (dayOfWeek === "*" || dayOfWeek === "?") {
    return null;
  }

  const dayNums = dayOfWeek
    .split(",")
    .map((d) => Number.parseInt(d.trim(), 10));
  const validDays = dayNums.filter((d) => d >= 0 && d <= 6);

  if (validDays.length === 0) {
    return null;
  }

  if (validDays.length === 7) {
    return "every day";
  }

  const isWeekdays =
    validDays.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => validDays.includes(d));
  if (isWeekdays) {
    return "on weekdays";
  }

  const isWeekends =
    validDays.length === 2 && validDays.includes(0) && validDays.includes(6);
  if (isWeekends) {
    return "on weekends";
  }

  const dayNames = validDays.map((d) => DAYS[d]).filter(Boolean);
  if (dayNames.length === 1) {
    return `on ${dayNames[0]}`;
  }
  return `on ${dayNames.join(", ")}`;
}

function parseDayOfMonth(dayOfMonth: string): string | null {
  if (dayOfMonth === "*" || dayOfMonth === "?") {
    return null;
  }
  if (dayOfMonth === "1") {
    return "on the 1st";
  }
  if (dayOfMonth === "15") {
    return "on the 15th";
  }
  return `on day ${dayOfMonth}`;
}

function parseMonth(month: string): string | null {
  if (month === "*") {
    return null;
  }
  const monthNum = Number.parseInt(month, 10);
  if (monthNum >= 1 && monthNum <= 12) {
    return `in ${MONTHS[monthNum - 1]}`;
  }
  return null;
}

function parseCronExpression(cron: string): string {
  const trimmed = cron.trim();

  const commonDescription = COMMON_CRONS[trimmed];
  if (commonDescription) {
    return commonDescription;
  }

  const parts = trimmed.split(WHITESPACE_REGEX);
  if (parts.length < 5) {
    return "Invalid cron expression";
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const descriptions: string[] = [];

  const timeDesc = parseTimeDescription(minute ?? "*", hour ?? "*");
  if (timeDesc) {
    descriptions.push(timeDesc);
  }

  const dayOfWeekDesc = parseDayOfWeek(dayOfWeek ?? "*");
  if (dayOfWeekDesc) {
    descriptions.push(dayOfWeekDesc);
  }

  const dayOfMonthDesc = parseDayOfMonth(dayOfMonth ?? "*");
  if (dayOfMonthDesc) {
    descriptions.push(dayOfMonthDesc);
  }

  const monthDesc = parseMonth(month ?? "*");
  if (monthDesc) {
    descriptions.push(monthDesc);
  }

  return descriptions.length > 0 ? descriptions.join(" ") : "Custom schedule";
}

export const CronDisplay = memo(function CronDisplayComponent({
  expression,
  className,
  showExpression = true,
}: CronDisplayProps) {
  const humanReadable = useMemo(
    () => parseCronExpression(expression),
    [expression]
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-xs">
        <Icons.Clock className="size-3 text-muted-foreground" />
        <span className="text-foreground">{humanReadable}</span>
      </div>
      {showExpression && (
        <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {expression}
        </code>
      )}
    </div>
  );
});

CronDisplay.displayName = "CronDisplay";
