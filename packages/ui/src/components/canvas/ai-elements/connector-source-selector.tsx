"use client";

import type { ConnectorType } from "@openbeam/types/services/connectors/events";
import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "../../../utils/cn";
import { Badge } from "../../badge";
import { Button } from "../../button";
import { Checkbox } from "../../checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../command";
import { Icons } from "../../icons";
import { Popover, PopoverContent, PopoverTrigger } from "../../popover";
import { useCanvasContext } from "../canvas-context";
import { CONNECTOR_ICONS } from "../event-types";

interface ConnectorSource {
  id: string;
  name: string;
  documentCount?: number;
}

interface ConnectorSourceSelectorProps {
  availableSources: ConnectorSource[];
  selectedSources: string[];
  onChange: (sources: string[]) => void;
  logos?: Partial<
    Record<
      ConnectorType,
      React.ComponentType<{ className?: string; size?: number }>
    >
  >;
}

export const ConnectorSourceSelector = memo(
  function ConnectorSourceSelectorComponent({
    availableSources,
    selectedSources,
    onChange,
    logos,
  }: ConnectorSourceSelectorProps) {
    const [open, setOpen] = useState(false);
    const { connectorLogos } = useCanvasContext();
    const effectiveLogos = logos ?? connectorLogos;

    const allSelected = selectedSources.length === 0;
    const selectedCount = selectedSources.length;

    const sourceMap = useMemo(
      () => new Map(availableSources.map((s) => [s.id, s])),
      [availableSources]
    );

    const toggleSource = useCallback(
      (sourceId: string) => {
        if (selectedSources.includes(sourceId)) {
          onChange(selectedSources.filter((s) => s !== sourceId));
        } else {
          onChange([...selectedSources, sourceId]);
        }
      },
      [selectedSources, onChange]
    );

    const selectAll = useCallback(() => {
      onChange([]);
    }, [onChange]);

    const getSourceIcon = useCallback(
      (sourceId: string) => {
        const connectorType = sourceId as ConnectorType;
        const CustomLogo = effectiveLogos?.[connectorType];
        if (CustomLogo) {
          return CustomLogo;
        }
        return CONNECTOR_ICONS[connectorType] ?? Icons.Database;
      },
      [effectiveLogos]
    );

    const hasCustomLogo = useCallback(
      (sourceId: string) => {
        const connectorType = sourceId as ConnectorType;
        return !!effectiveLogos?.[connectorType];
      },
      [effectiveLogos]
    );

    const triggerLabel = useMemo(() => {
      if (allSelected) {
        return `All sources (${availableSources.length})`;
      }
      if (selectedCount === 1) {
        const firstSource = selectedSources[0];
        if (firstSource) {
          const source = sourceMap.get(firstSource);
          return source?.name ?? firstSource;
        }
      }
      return `${selectedCount} sources`;
    }, [
      allSelected,
      availableSources.length,
      selectedCount,
      selectedSources,
      sourceMap,
    ]);

    const TriggerIcon = useMemo(() => {
      if (allSelected || selectedCount !== 1) {
        return Icons.Database;
      }
      const firstSource = selectedSources[0];
      if (firstSource) {
        return getSourceIcon(firstSource);
      }
      return Icons.Database;
    }, [allSelected, selectedCount, selectedSources, getSourceIcon]);

    const triggerIconHasCustomLogo = useMemo(() => {
      if (allSelected || selectedCount !== 1) {
        return false;
      }
      const firstSource = selectedSources[0];
      return firstSource ? hasCustomLogo(firstSource) : false;
    }, [allSelected, selectedCount, selectedSources, hasCustomLogo]);

    return (
      <Popover modal onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-controls="connector-source-list"
            aria-expanded={open}
            className="h-9 w-full justify-between font-normal"
            role="combobox"
            variant="outline"
          >
            <div className="flex items-center gap-2 truncate">
              <TriggerIcon
                className={cn(
                  "size-4 shrink-0",
                  !triggerIconHasCustomLogo && "text-muted-foreground"
                )}
              />
              <span className="truncate">{triggerLabel}</span>
              {allSelected && (
                <Badge
                  className="ml-1 px-1.5 py-0 text-[10px]"
                  variant="outline"
                >
                  All
                </Badge>
              )}
            </div>
            <Icons.ChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search sources..." />
            <CommandList
              className="no-scrollbar max-h-[280px]"
              id="connector-source-list"
            >
              <CommandEmpty>No sources found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  className="flex items-center gap-2"
                  onSelect={selectAll}
                  value="all-sources"
                >
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center rounded-sm border",
                      allSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {allSelected && <Icons.Check className="size-3" />}
                  </div>
                  <Icons.Layers className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">All sources</span>
                  <Badge
                    className="ml-auto px-1.5 py-0 text-[10px]"
                    variant="secondary"
                  >
                    {availableSources.length}
                  </Badge>
                </CommandItem>

                {availableSources.map((source) => {
                  const isSelected = selectedSources.includes(source.id);
                  const SourceIcon = getSourceIcon(source.id);
                  const sourceHasCustomLogo = hasCustomLogo(source.id);

                  return (
                    <CommandItem
                      key={source.id}
                      onSelect={() => toggleSource(source.id)}
                      value={`${source.id} ${source.name}`}
                    >
                      <div className="flex w-full items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          className="pointer-events-none"
                        />
                        <SourceIcon
                          className={cn(
                            "size-4 shrink-0",
                            !sourceHasCustomLogo && "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{source.name}</span>
                        {source.documentCount !== undefined && (
                          <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                            {source.documentCount.toLocaleString()} docs
                          </span>
                        )}
                      </div>
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
);

ConnectorSourceSelector.displayName = "ConnectorSourceSelector";

export type { ConnectorSource, ConnectorSourceSelectorProps };
