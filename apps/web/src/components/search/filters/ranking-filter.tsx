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
  RANKING_CONFIG,
  RANKING_OPTIONS,
  type SearchRanking,
} from "@/lib/search-config";
import { cn } from "@/lib/utils";

type RankingFilterProps = {
  value: SearchRanking;
  onChange: (value: SearchRanking) => void;
};

export function RankingFilter({ value, onChange }: RankingFilterProps) {
  const [open, setOpen] = useState(false);
  const config = RANKING_CONFIG[value];
  const Icon = Icons[config.icon];

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 gap-2 border-border/50 px-3 text-xs",
            value !== "hybrid" && "bg-foreground/5"
          )}
          size="sm"
          variant="outline"
        >
          <Icon className="text-foreground/50" size={14} />
          {config.label}
          <Icons.ChevronDown className="text-foreground/40" size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] p-0">
        <Command>
          <CommandList>
            <CommandGroup heading="Sort by">
              {RANKING_OPTIONS.map((option) => {
                const optConfig = RANKING_CONFIG[option];
                const OptIcon = Icons[optConfig.icon];
                return (
                  <CommandItem
                    key={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    <OptIcon className="text-foreground/50" size={14} />
                    <span className="flex-1">{optConfig.label}</span>
                    {value === option && (
                      <Icons.CheckIcon className="text-foreground" size={14} />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
