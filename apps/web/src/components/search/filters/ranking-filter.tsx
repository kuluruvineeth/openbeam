"use client";

import { useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RANKING_CONFIG,
  RANKING_OPTIONS,
  type SearchRanking,
} from "@/lib/search-config";
import { cn } from "@/lib/utils";

type RankingFilterProps = {
  value: SearchRanking;
  onChange: (value: SearchRanking) => void;
  onAdvancedToggle?: () => void;
  advancedMode?: boolean;
};

const KEYBOARD_HINTS: Record<SearchRanking, string> = {
  bm25: "⌘1",
  semantic: "⌘2",
  hybrid: "⌘3",
  hybrid_v2: "⌘4",
  hybrid_v2_rerank: "⌘5",
  recency: "",
  engagement: "",
};

export function RankingFilter({
  value,
  onChange,
  onAdvancedToggle,
  advancedMode,
}: RankingFilterProps) {
  const [open, setOpen] = useState(false);
  const config = RANKING_CONFIG[value];
  const Icon = Icons[config.icon];

  const groupedOptions = useMemo(() => {
    const standard = RANKING_OPTIONS.filter(
      (o) => RANKING_CONFIG[o].group === "standard"
    );
    const advanced = RANKING_OPTIONS.filter(
      (o) => RANKING_CONFIG[o].group === "advanced"
    );
    const other = RANKING_OPTIONS.filter(
      (o) => RANKING_CONFIG[o].group === "other"
    );
    return { standard, advanced, other };
  }, []);

  const renderOption = (option: SearchRanking) => {
    const optConfig = RANKING_CONFIG[option];
    const OptIcon = Icons[optConfig.icon];
    const hint = KEYBOARD_HINTS[option];

    return (
      <CommandItem
        className="flex items-center gap-2"
        key={option}
        onSelect={() => {
          onChange(option);
          setOpen(false);
        }}
      >
        <OptIcon className="text-foreground/50" size={14} />
        <span className="flex-1">{optConfig.label}</span>
        {hint && (
          <kbd className="font-mono text-[10px] text-foreground/30">{hint}</kbd>
        )}
        {value === option && (
          <Icons.CheckIcon className="text-foreground" size={14} />
        )}
      </CommandItem>
    );
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "h-8 gap-2 border-border/50 px-3 text-xs",
                  value !== "hybrid_v2" && "bg-foreground/5"
                )}
                size="sm"
                variant="outline"
              >
                <Icon className="text-foreground/50" size={14} />
                {config.label}
                <Icons.ChevronDown className="text-foreground/40" size={12} />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="text-xs" side="bottom">
            <span>Ranking mode</span>
            <kbd className="ml-2 font-mono text-[10px] text-foreground/50">
              ⌘1-4
            </kbd>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-[200px] p-0">
        <Command>
          <CommandList className="no-scrollbar">
            <CommandGroup heading="Advanced">
              {groupedOptions.advanced.map(renderOption)}
            </CommandGroup>
            <CommandSeparator className="bg-border/50" />
            <CommandGroup heading="Standard">
              {groupedOptions.standard.map(renderOption)}
            </CommandGroup>
            <CommandSeparator className="bg-border/50" />
            <CommandGroup heading="Other">
              {groupedOptions.other.map(renderOption)}
            </CommandGroup>
            {onAdvancedToggle && (
              <>
                <CommandSeparator className="bg-border/50" />
                <div className="p-1">
                  <Button
                    className={cn(
                      "w-full justify-start gap-2 text-xs",
                      advancedMode && "bg-foreground/5"
                    )}
                    onClick={() => {
                      onAdvancedToggle();
                      setOpen(false);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <Icons.Settings className="text-foreground/50" size={14} />
                    <span>Tune weights</span>
                    <kbd className="ml-auto font-mono text-[10px] text-foreground/30">
                      ⌘⇧S
                    </kbd>
                  </Button>
                </div>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
