"use client";

import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "../utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Icons } from "./icons";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  formatStr?: string;
}

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  formatStr = "PPP",
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          variant="outline"
        >
          <Icons.Calendar className="mr-2 size-4" />
          {value ? format(value, formatStr) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          initialFocus
          mode="single"
          onSelect={onChange}
          selected={value}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  numberOfMonths?: number;
  formatStr?: string;
}

function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  disabled,
  className,
  numberOfMonths = 2,
  formatStr = "LLL dd, y",
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          variant="outline"
        >
          <Icons.Calendar className="mr-2 size-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, formatStr)} - {format(value.to, formatStr)}
              </>
            ) : (
              format(value.from, formatStr)
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          defaultMonth={value?.from}
          initialFocus
          mode="range"
          numberOfMonths={numberOfMonths}
          onSelect={onChange}
          selected={value}
        />
      </PopoverContent>
    </Popover>
  );
}

interface CompactDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function CompactDatePicker({
  value,
  onChange,
  placeholder = "Date",
  disabled,
  className,
}: CompactDatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-sm bg-background/50 px-2 text-xs transition-colors hover:bg-background/80",
            !value && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          type="button"
        >
          <Icons.Calendar className="size-3" />
          {value ? format(value, "MMM d, yyyy") : <span>{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" sideOffset={4}>
        <Calendar
          initialFocus
          mode="single"
          onSelect={onChange}
          selected={value}
        />
      </PopoverContent>
    </Popover>
  );
}

export { CompactDatePicker, DatePicker, DateRangePicker };
export type { CompactDatePickerProps, DatePickerProps, DateRangePickerProps };
