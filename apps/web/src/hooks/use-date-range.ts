"use client";

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  formatISO,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { createParser, useQueryState } from "nuqs";

export type DatePreset =
  | "today"
  | "yesterday"
  | "last7d"
  | "last30d"
  | "last90d"
  | "thisWeek"
  | "thisMonth"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePreset;
}

function createPresetRange(
  preset: Exclude<DatePreset, "custom">,
  now: Date
): DateRange {
  const ranges: Record<Exclude<DatePreset, "custom">, DateRange> = {
    today: { preset: "today", from: startOfDay(now), to: endOfDay(now) },
    yesterday: {
      preset: "yesterday",
      from: startOfDay(subDays(now, 1)),
      to: endOfDay(subDays(now, 1)),
    },
    last7d: {
      preset: "last7d",
      from: startOfDay(subDays(now, 6)),
      to: endOfDay(now),
    },
    last30d: {
      preset: "last30d",
      from: startOfDay(subDays(now, 29)),
      to: endOfDay(now),
    },
    last90d: {
      preset: "last90d",
      from: startOfDay(subDays(now, 89)),
      to: endOfDay(now),
    },
    thisWeek: {
      preset: "thisWeek",
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    },
    thisMonth: {
      preset: "thisMonth",
      from: startOfMonth(now),
      to: endOfMonth(now),
    },
  };
  return ranges[preset];
}

export const dateRangeParser = createParser<DateRange>({
  parse(value) {
    if (!value) {
      return null;
    }
    const [preset, fromStr, toStr] = value.split("_");

    if (preset === "custom" && fromStr && toStr) {
      return {
        preset: "custom" as DatePreset,
        from: parseISO(fromStr),
        to: parseISO(toStr),
      };
    }

    const now = new Date();
    const validPresets: Exclude<DatePreset, "custom">[] = [
      "today",
      "yesterday",
      "last7d",
      "last30d",
      "last90d",
      "thisWeek",
      "thisMonth",
    ];

    if (validPresets.includes(preset as Exclude<DatePreset, "custom">)) {
      return createPresetRange(preset as Exclude<DatePreset, "custom">, now);
    }

    return null;
  },
  serialize(value) {
    if (value.preset === "custom") {
      return `custom_${formatISO(value.from, { representation: "date" })}_${formatISO(value.to, { representation: "date" })}`;
    }
    return value.preset;
  },
});

export function useDateRange() {
  const [dateRange, setDateRange] = useQueryState(
    "date",
    dateRangeParser.withOptions({ shallow: false })
  );

  const setPreset = (preset: Exclude<DatePreset, "custom">) => {
    const now = new Date();
    setDateRange(createPresetRange(preset, now));
  };

  const setCustomRange = (from: Date, to: Date) => {
    setDateRange({ preset: "custom", from, to });
  };

  const clearDateRange = () => {
    setDateRange(null);
  };

  return {
    dateRange,
    setDateRange,
    setPreset,
    setCustomRange,
    clearDateRange,
  };
}
