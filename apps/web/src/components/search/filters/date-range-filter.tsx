"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DATE_RANGE_CONFIG,
  DATE_RANGE_OPTIONS,
  type DateRangeType,
} from "@/lib/search-config";
import { cn } from "@/lib/utils";

type DateRangeFilterProps = {
  value: DateRangeType | null;
  onChange: (value: DateRangeType | null) => void;
};

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 gap-2 border-border/50 px-3 text-xs",
            value && "bg-foreground/5"
          )}
          size="sm"
          variant="outline"
        >
          <Icons.Calendar className="text-foreground/50" size={14} />
          {value ? DATE_RANGE_CONFIG[value] : "Date"}
          <Icons.ChevronDown className="text-foreground/40" size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] p-0">
        <Command>
          <CommandList className="no-scrollbar">
            <CommandGroup>
              {DATE_RANGE_OPTIONS.filter((opt) => opt !== "custom").map(
                (option) => (
                  <CommandItem
                    key={option}
                    onSelect={() => {
                      onChange(value === option ? null : option);
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1">{DATE_RANGE_CONFIG[option]}</span>
                    {value === option && (
                      <Icons.CheckIcon className="text-foreground" size={14} />
                    )}
                  </CommandItem>
                )
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
