"use client";

import { forwardRef, memo, useCallback, useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

type ScheduleFrequency = "hourly" | "daily" | "weekly" | "monthly" | "custom";

type WeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

interface ScheduleConfig {
  frequency: ScheduleFrequency;
  hour?: number;
  minute?: number;
  weekdays?: WeekDay[];
  monthDay?: number;
}

interface ScheduleBuilderProps {
  value?: string;
  onChange: (cron: string) => void;
  className?: string;
}

const WEEKDAYS: { value: WeekDay; label: string; short: string }[] = [
  { value: "MON", label: "Monday", short: "Mon" },
  { value: "TUE", label: "Tuesday", short: "Tue" },
  { value: "WED", label: "Wednesday", short: "Wed" },
  { value: "THU", label: "Thursday", short: "Thu" },
  { value: "FRI", label: "Friday", short: "Fri" },
  { value: "SAT", label: "Saturday", short: "Sat" },
  { value: "SUN", label: "Sunday", short: "Sun" },
];

const WEEKDAY_TO_CRON: Record<WeekDay, string> = {
  SUN: "0",
  MON: "1",
  TUE: "2",
  WED: "3",
  THU: "4",
  FRI: "5",
  SAT: "6",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function formatHour(hour: number): string {
  if (hour === 0) {
    return "12:00 AM";
  }
  if (hour === 12) {
    return "12:00 PM";
  }
  if (hour < 12) {
    return `${hour}:00 AM`;
  }
  return `${hour - 12}:00 PM`;
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

function configToCron(config: ScheduleConfig): string {
  const minute = config.minute ?? 0;
  const hour = config.hour ?? 9;

  switch (config.frequency) {
    case "hourly":
      return `${minute} * * * *`;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly": {
      const days = config.weekdays?.length
        ? config.weekdays.map((d) => WEEKDAY_TO_CRON[d]).join(",")
        : "1";
      return `${minute} ${hour} * * ${days}`;
    }
    case "monthly": {
      const day = config.monthDay ?? 1;
      return `${minute} ${hour} ${day} * *`;
    }
    case "custom":
      return `${minute} ${hour} * * *`;
    default:
      return `${minute} ${hour} * * *`;
  }
}

function cronToConfig(cron: string): ScheduleConfig {
  if (!cron) {
    return { frequency: "daily", hour: 9, minute: 0 };
  }

  const parts = cron.split(" ");
  if (parts.length !== 5) {
    return { frequency: "daily", hour: 9, minute: 0 };
  }

  const [minutePart, hourPart, dayOfMonth, , dayOfWeek] = parts;
  const minute =
    minutePart === "*" ? 0 : Number.parseInt(minutePart ?? "0", 10);
  const hour = hourPart === "*" ? 9 : Number.parseInt(hourPart ?? "9", 10);

  if (hourPart === "*") {
    return { frequency: "hourly", minute };
  }

  if (dayOfMonth !== "*") {
    return {
      frequency: "monthly",
      hour,
      minute,
      monthDay: Number.parseInt(dayOfMonth ?? "1", 10),
    };
  }

  if (dayOfWeek !== "*") {
    const cronToDayMap: Record<string, WeekDay> = {
      "0": "SUN",
      "1": "MON",
      "2": "TUE",
      "3": "WED",
      "4": "THU",
      "5": "FRI",
      "6": "SAT",
    };
    const weekdays = (dayOfWeek ?? "")
      .split(",")
      .map((d) => cronToDayMap[d])
      .filter((d): d is WeekDay => d !== undefined);

    return { frequency: "weekly", hour, minute, weekdays };
  }

  return { frequency: "daily", hour, minute };
}

function getHourlyReadable(minute: number): string {
  if (minute === 0) {
    return "Every hour, on the hour";
  }
  return `Every hour, at ${minute} minutes past`;
}

function getWeeklyReadable(days: WeekDay[], time: string): string {
  if (days.length === 0) {
    return `Every Monday at ${time}`;
  }
  const hasWeekends = days.includes("SAT") && days.includes("SUN");
  const isWeekdaysOnly =
    days.length === 5 && !days.includes("SAT") && !days.includes("SUN");

  if (isWeekdaysOnly) {
    return `Weekdays at ${time}`;
  }
  if (days.length === 2 && hasWeekends) {
    return `Weekends at ${time}`;
  }
  if (days.length === 7) {
    return `Every day at ${time}`;
  }

  const dayLabels = days.map(
    (d) => WEEKDAYS.find((wd) => wd.value === d)?.short ?? d
  );
  if (dayLabels.length === 1) {
    const fullLabel =
      WEEKDAYS.find((wd) => wd.value === days[0])?.label ?? days[0];
    return `Every ${fullLabel} at ${time}`;
  }
  return `${dayLabels.join(", ")} at ${time}`;
}

function getOrdinalSuffix(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0] ?? "th";
}

function getHumanReadable(config: ScheduleConfig): string {
  const time = formatTime(config.hour ?? 9, config.minute ?? 0);

  switch (config.frequency) {
    case "hourly":
      return getHourlyReadable(config.minute ?? 0);
    case "daily":
      return `Every day at ${time}`;
    case "weekly":
      return getWeeklyReadable(config.weekdays ?? ["MON"], time);
    case "monthly": {
      const day = config.monthDay ?? 1;
      const suffix = getOrdinalSuffix(day);
      return `Monthly on the ${day}${suffix} at ${time}`;
    }
    default:
      return `Every day at ${time}`;
  }
}

interface FrequencySelectorProps {
  selectedValue: ScheduleFrequency;
  onFrequencyChange: (v: ScheduleFrequency) => void;
}

const FrequencySelector = memo(function FrequencySelectorInner({
  selectedValue,
  onFrequencyChange,
}: FrequencySelectorProps) {
  const options: { value: ScheduleFrequency; label: string }[] = [
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  return (
    <Select
      onValueChange={(v) => onFrequencyChange(v as ScheduleFrequency)}
      value={selectedValue}
    >
      <SelectTrigger className="h-9">
        <span>
          {options.find((o) => o.value === selectedValue)?.label ?? "Daily"}
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

interface TimeSelectorProps {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  showMinute?: boolean;
}

const TimeSelector = memo(function TimeSelectorInner({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  showMinute = true,
}: TimeSelectorProps) {
  return (
    <div className="flex gap-2">
      <Select
        onValueChange={(v) => onHourChange(Number.parseInt(v, 10))}
        value={hour.toString()}
      >
        <SelectTrigger className="h-9 w-28">
          <span>{formatHour(hour)}</span>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {HOURS.map((hourOption) => (
            <SelectItem key={hourOption} value={hourOption.toString()}>
              {formatHour(hourOption)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showMinute && (
        <Select
          onValueChange={(v) => onMinuteChange(Number.parseInt(v, 10))}
          value={minute.toString()}
        >
          <SelectTrigger className="h-9 w-20">
            <span>:{minute.toString().padStart(2, "0")}</span>
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((minuteOption) => (
              <SelectItem key={minuteOption} value={minuteOption.toString()}>
                :{minuteOption.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
});

interface WeekdaySelectorProps {
  selected: WeekDay[];
  onWeekdaysChange: (days: WeekDay[]) => void;
}

const WeekdaySelector = memo(function WeekdaySelectorInner({
  selected,
  onWeekdaysChange,
}: WeekdaySelectorProps) {
  return (
    <ToggleGroup
      className="flex-wrap gap-1"
      onValueChange={(values) => onWeekdaysChange(values as WeekDay[])}
      type="multiple"
      value={selected}
    >
      {WEEKDAYS.map((day) => (
        <ToggleGroupItem
          className={cn(
            "h-8 w-8 shrink-0 rounded-sm text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          )}
          key={day.value}
          value={day.value}
        >
          {day.short.charAt(0)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
});

interface MonthDaySelectorProps {
  selectedDay: number;
  onDayChange: (day: number) => void;
}

const MonthDaySelector = memo(function MonthDaySelectorInner({
  selectedDay,
  onDayChange,
}: MonthDaySelectorProps) {
  return (
    <Select
      onValueChange={(v) => onDayChange(Number.parseInt(v, 10))}
      value={selectedDay.toString()}
    >
      <SelectTrigger className="h-9 w-24">
        <span>Day {selectedDay}</span>
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {MONTH_DAYS.map((dayOption) => (
          <SelectItem key={dayOption} value={dayOption.toString()}>
            Day {dayOption}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

export const ScheduleBuilder = memo(
  forwardRef<HTMLDivElement, ScheduleBuilderProps>(
    function ScheduleBuilderComponent({ value, onChange, className }, ref) {
      const [config, setConfig] = useState<ScheduleConfig>(() =>
        cronToConfig(value ?? "")
      );

      const updateConfig = useCallback(
        (updates: Partial<ScheduleConfig>) => {
          setConfig((prev) => {
            const next = { ...prev, ...updates };
            const cron = configToCron(next);
            onChange(cron);
            return next;
          });
        },
        [onChange]
      );

      const handleFrequencyChange = useCallback(
        (frequency: ScheduleFrequency) => {
          const updates: Partial<ScheduleConfig> = { frequency };
          if (frequency === "weekly" && !config.weekdays?.length) {
            updates.weekdays = ["MON"];
          }
          if (frequency === "monthly" && !config.monthDay) {
            updates.monthDay = 1;
          }
          updateConfig(updates);
        },
        [config.weekdays, config.monthDay, updateConfig]
      );

      const humanReadable = useMemo(() => getHumanReadable(config), [config]);

      return (
        <div className={cn("min-w-0 space-y-4", className)} ref={ref}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-muted-foreground text-xs">
                Repeat
              </span>
              <FrequencySelector
                onFrequencyChange={handleFrequencyChange}
                selectedValue={config.frequency}
              />
            </div>

            {config.frequency === "hourly" && (
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-muted-foreground text-xs">
                  At
                </span>
                <Select
                  onValueChange={(v) =>
                    updateConfig({ minute: Number.parseInt(v, 10) })
                  }
                  value={(config.minute ?? 0).toString()}
                >
                  <SelectTrigger className="h-9 w-32">
                    <span>
                      {config.minute === 0
                        ? "On the hour"
                        : `:${(config.minute ?? 0).toString().padStart(2, "0")} past`}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">On the hour</SelectItem>
                    <SelectItem value="15">:15 past</SelectItem>
                    <SelectItem value="30">:30 past</SelectItem>
                    <SelectItem value="45">:45 past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.frequency === "daily" && (
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-muted-foreground text-xs">
                  At
                </span>
                <TimeSelector
                  hour={config.hour ?? 9}
                  minute={config.minute ?? 0}
                  onHourChange={(hour) => updateConfig({ hour })}
                  onMinuteChange={(minute) => updateConfig({ minute })}
                />
              </div>
            )}

            {config.frequency === "weekly" && (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground text-xs">
                    On
                  </span>
                  <WeekdaySelector
                    onWeekdaysChange={(weekdays) => updateConfig({ weekdays })}
                    selected={config.weekdays ?? ["MON"]}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground text-xs">
                    At
                  </span>
                  <TimeSelector
                    hour={config.hour ?? 9}
                    minute={config.minute ?? 0}
                    onHourChange={(hour) => updateConfig({ hour })}
                    onMinuteChange={(minute) => updateConfig({ minute })}
                  />
                </div>
              </>
            )}

            {config.frequency === "monthly" && (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground text-xs">
                    On
                  </span>
                  <MonthDaySelector
                    onDayChange={(monthDay) => updateConfig({ monthDay })}
                    selectedDay={config.monthDay ?? 1}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-muted-foreground text-xs">
                    At
                  </span>
                  <TimeSelector
                    hour={config.hour ?? 9}
                    minute={config.minute ?? 0}
                    onHourChange={(hour) => updateConfig({ hour })}
                    onMinuteChange={(minute) => updateConfig({ minute })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="rounded-sm border border-border/50 bg-muted/50 px-3 py-2">
            <p className="text-muted-foreground text-xs">{humanReadable}</p>
          </div>
        </div>
      );
    }
  )
);

ScheduleBuilder.displayName = "ScheduleBuilder";
