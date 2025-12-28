"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSelectFilterProps<T extends string> = {
  label: string;
  icon: keyof typeof Icons;
  options: readonly T[];
  selected: string[];
  onChange: (value: string[] | null) => void;
  renderOption: (option: T) => React.ReactNode;
  renderSelected?: () => React.ReactNode;
};

export function MultiSelectFilter<T extends string>({
  label,
  icon,
  options,
  selected,
  onChange,
  renderOption,
  renderSelected,
}: MultiSelectFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const Icon = Icons[icon];

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      const newSelection = selected.filter((s) => s !== option);
      onChange(newSelection.length > 0 ? newSelection : null);
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 gap-2 border-border/50 px-3 text-xs",
            selected.length > 0 && "bg-foreground/5"
          )}
          size="sm"
          variant="outline"
        >
          <Icon className="text-foreground/50" size={14} />
          {selected.length > 0 ? (
            renderSelected ? (
              renderSelected()
            ) : (
              <span>
                {label}{" "}
                <span className="text-foreground/50">({selected.length})</span>
              </span>
            )
          ) : (
            label
          )}
          <Icons.ChevronDown className="text-foreground/40" size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList className="no-scrollbar">
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} onSelect={() => toggleOption(option)}>
                  <div
                    className={cn(
                      "mr-2 flex size-4 items-center justify-center border border-border/50",
                      selected.includes(option) &&
                        "bg-foreground text-background"
                    )}
                  >
                    {selected.includes(option) && <Icons.CheckIcon size={10} />}
                  </div>
                  {renderOption(option)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <div className="border-border/40 border-t p-1">
              <Button
                className="h-7 w-full text-xs"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                size="sm"
                variant="ghost"
              >
                Clear selection
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
