import {
  differenceInCalendarDays,
  isToday,
  isYesterday,
  startOfDay,
} from "date-fns";

type SessionLike = {
  updatedAt: string;
};

type SessionGroup<T extends SessionLike> = {
  label: string;
  sessions: T[];
};

export function groupSessionsByDate<T extends SessionLike>(
  sessions: T[]
): SessionGroup<T>[] {
  const today: T[] = [];
  const yesterday: T[] = [];
  const lastWeek: T[] = [];
  const older: T[] = [];
  const now = startOfDay(new Date());

  for (const session of sessions) {
    const date = new Date(session.updatedAt);
    if (isToday(date)) {
      today.push(session);
    } else if (isYesterday(date)) {
      yesterday.push(session);
    } else if (differenceInCalendarDays(now, date) <= 7) {
      lastWeek.push(session);
    } else {
      older.push(session);
    }
  }

  const groups: SessionGroup<T>[] = [];

  if (today.length > 0) {
    groups.push({ label: "Today", sessions: today });
  }
  if (yesterday.length > 0) {
    groups.push({ label: "Yesterday", sessions: yesterday });
  }
  if (lastWeek.length > 0) {
    groups.push({ label: "Last 7 Days", sessions: lastWeek });
  }
  if (older.length > 0) {
    groups.push({ label: "Older", sessions: older });
  }

  return groups;
}
