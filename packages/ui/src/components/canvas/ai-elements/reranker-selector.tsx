"use client";

import {
  DEFAULT_RERANKER_MODEL_ID,
  getRerankerModel,
  RERANKER_MODELS,
  type RerankerModel,
} from "@openbeam/types/ai";
import { cva } from "class-variance-authority";
import { forwardRef, memo, useCallback, useMemo, useState } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Button } from "../../button";
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
import { ProviderIcon } from "../../provider-icons";

const costStyles = cva("font-medium text-[10px] tabular-nums", {
  variants: {
    type: {
      free: "text-emerald-500",
      paid: "text-amber-500",
    },
  },
});

function formatCost(pricing: RerankerModel["pricing"]): string {
  if (pricing.perSearch === 0) {
    return "Free";
  }
  if (pricing.perSearch < 0.001) {
    return `$${(pricing.perSearch * 1000).toFixed(2)}/1K`;
  }
  return `$${pricing.perSearch.toFixed(3)}/search`;
}

export interface RerankerSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const RerankerSelector = memo(
  forwardRef<HTMLButtonElement, RerankerSelectorProps>(
    function RerankerSelectorComponent(
      { value, onValueChange, disabled, className },
      ref
    ) {
      const [open, setOpen] = useState(false);
      const [search, setSearch] = useState("");

      const selectedModel = useMemo(
        () =>
          getRerankerModel(value) ??
          getRerankerModel(DEFAULT_RERANKER_MODEL_ID),
        [value]
      );

      const filteredModels = useMemo(() => {
        if (!search) {
          return RERANKER_MODELS;
        }
        const lower = search.toLowerCase();
        return RERANKER_MODELS.filter(
          (m) =>
            m.name.toLowerCase().includes(lower) ||
            m.id.toLowerCase().includes(lower)
        );
      }, [search]);

      const handleSelect = useCallback(
        (modelId: string) => {
          onValueChange(modelId);
          setOpen(false);
          setSearch("");
        },
        [onValueChange]
      );

      return (
        <Popover modal onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button
              aria-controls="reranker-selector-list"
              aria-expanded={open}
              className={cn(
                "h-9 w-full justify-between font-normal",
                className
              )}
              disabled={disabled}
              ref={ref}
              role="combobox"
              variant="outline"
            >
              {selectedModel ? (
                <div className="flex items-center gap-2 overflow-hidden">
                  <ProviderIcon
                    className="size-4 shrink-0"
                    providerId={selectedModel.provider}
                  />
                  <span className="truncate">{selectedModel.name}</span>
                  {selectedModel.isLocal && (
                    <Badge className="shrink-0 text-[10px]" variant="outline">
                      Local
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">
                  Select reranker...
                </span>
              )}
              <Icons.ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[320px] p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
            side="bottom"
          >
            <Command shouldFilter={false}>
              <CommandInput
                onValueChange={setSearch}
                placeholder="Search rerankers..."
                value={search}
              />
              <CommandList
                className="no-scrollbar max-h-[300px] overscroll-contain"
                id="reranker-selector-list"
              >
                <CommandEmpty>No rerankers found.</CommandEmpty>
                <CommandGroup>
                  {filteredModels.map((model) => {
                    const isSelected = model.id === value;
                    const isFree = model.pricing.perSearch === 0;

                    return (
                      <CommandItem
                        key={model.id}
                        onSelect={() => handleSelect(model.id)}
                        value={model.id}
                      >
                        <div className="flex w-full items-center gap-2">
                          <Icons.Check
                            className={cn(
                              "size-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <ProviderIcon
                            className="size-4 shrink-0"
                            providerId={model.provider}
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm">
                                {model.name}
                              </span>
                              {model.isLocal && (
                                <Badge
                                  className="shrink-0 text-[9px]"
                                  variant="outline"
                                >
                                  Local
                                </Badge>
                              )}
                            </div>
                            <span className="text-muted-foreground text-xs">
                              Max {model.maxDocuments} docs
                              {model.supportsMultilingual && " • Multilingual"}
                            </span>
                          </div>
                          <span
                            className={cn(
                              costStyles({ type: isFree ? "free" : "paid" })
                            )}
                          >
                            {formatCost(model.pricing)}
                          </span>
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
  )
);

RerankerSelector.displayName = "RerankerSelector";
