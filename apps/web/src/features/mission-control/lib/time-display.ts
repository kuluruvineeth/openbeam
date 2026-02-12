const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});
const CLOCK_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const TIMELINE_RELATIVE_WINDOW_MS = 12 * HOUR_MS;

function isSameCalendarDay(timestamp: number, nowMs: number): boolean {
  const date = new Date(timestamp);
  const now = new Date(nowMs);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function resolveRelativeValue(diffMs: number, unitMs: number): number {
  const raw = diffMs / unitMs;
  return raw > 0 ? Math.ceil(raw) : Math.floor(raw);
}

export function formatAbsoluteClockTime(
  timestamp: number,
  nowMs = Date.now()
): string {
  const date = new Date(timestamp);
  return isSameCalendarDay(timestamp, nowMs)
    ? CLOCK_FORMATTER.format(date)
    : DATE_TIME_FORMATTER.format(date);
}

export function formatRelativeTimestamp(
  timestamp: number,
  nowMs: number
): string {
  const diffMs = timestamp - nowMs;
  const absDiff = Math.abs(diffMs);

  if (absDiff < MINUTE_MS) {
    return "just now";
  }

  if (absDiff < HOUR_MS) {
    return RELATIVE_FORMATTER.format(
      resolveRelativeValue(diffMs, MINUTE_MS),
      "minute"
    );
  }

  if (absDiff < DAY_MS) {
    return RELATIVE_FORMATTER.format(
      resolveRelativeValue(diffMs, HOUR_MS),
      "hour"
    );
  }

  return RELATIVE_FORMATTER.format(resolveRelativeValue(diffMs, DAY_MS), "day");
}

export function formatContextualTimestamp(
  timestamp: number,
  nowMs: number
): string {
  const ageMs = Math.abs(nowMs - timestamp);
  if (ageMs < HOUR_MS) {
    return formatRelativeTimestamp(timestamp, nowMs);
  }
  return formatAbsoluteClockTime(timestamp, nowMs);
}

export type TimelineTimestampDisplay = {
  primary: string;
  secondary: string;
  dateTime: string;
};

export function formatTimelineTimestamp(
  timestamp: number,
  nowMs: number
): TimelineTimestampDisplay {
  const relative = formatRelativeTimestamp(timestamp, nowMs);
  const absolute = formatAbsoluteClockTime(timestamp, nowMs);

  if (Math.abs(nowMs - timestamp) <= TIMELINE_RELATIVE_WINDOW_MS) {
    return {
      primary: relative,
      secondary: absolute,
      dateTime: new Date(timestamp).toISOString(),
    };
  }

  return {
    primary: absolute,
    secondary: relative,
    dateTime: new Date(timestamp).toISOString(),
  };
}
