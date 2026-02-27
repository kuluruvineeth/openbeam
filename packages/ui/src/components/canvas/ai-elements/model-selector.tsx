"use client";

import {
  ALL_IMAGE_MODELS,
  ALL_TTS_MODELS,
  ALL_VIDEO_MODELS,
  CHAT_MODELS,
  type ChatModel,
  getChatModel,
  getImageModel,
  getTTSModel,
  getVideoModel,
  type ImageModel,
  type ProviderId,
  type TTSModel,
  type VideoModel,
} from "@openplane/types/ai";
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

const costBracketStyles = cva("font-medium text-[10px] tabular-nums", {
  variants: {
    bracket: {
      lowest: "text-emerald-500",
      low: "text-green-500",
      medium: "text-amber-500",
      high: "text-orange-500",
      highest: "text-red-500",
    },
  },
});

type CostBracket = "lowest" | "low" | "medium" | "high" | "highest";

function getCostBracket(pricing: { inputPer1M?: number }): CostBracket {
  const cost = pricing.inputPer1M ?? 0;
  if (cost < 0.5) {
    return "lowest";
  }
  if (cost < 2) {
    return "low";
  }
  if (cost < 5) {
    return "medium";
  }
  if (cost < 10) {
    return "high";
  }
  return "highest";
}

function formatCost(pricing: { inputPer1M?: number }): string {
  const cost = pricing.inputPer1M ?? 0;
  if (cost < 0.01) {
    return "<$0.01";
  }
  if (cost < 1) {
    return `$${cost.toFixed(2)}`;
  }
  return `$${cost.toFixed(0)}`;
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  azure: "Azure",
  ollama: "Ollama",
  cohere: "Cohere",
  voyage: "Voyage",
  openplane: "OpenPlane",
  twelvelabs: "TwelveLabs",
  elevenlabs: "ElevenLabs",
  cartesia: "Cartesia",
  playht: "PlayHT",
  deepgram: "Deepgram",
  assemblyai: "AssemblyAI",
  stability: "Stability",
  blackforestlabs: "Black Forest Labs",
  runway: "Runway",
  jina: "Jina",
};

type ModelType = "chat" | "image" | "audio" | "video";

export interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  type?: ModelType;
  disabled?: boolean;
  className?: string;
}

type AnyModel = ChatModel | ImageModel | TTSModel | VideoModel;

function getModelsForType(type: ModelType): AnyModel[] {
  switch (type) {
    case "chat":
      return CHAT_MODELS;
    case "image":
      return ALL_IMAGE_MODELS;
    case "audio":
      return ALL_TTS_MODELS;
    case "video":
      return ALL_VIDEO_MODELS;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function getModelForType(
  type: ModelType,
  modelId: string
): AnyModel | undefined {
  switch (type) {
    case "chat":
      return getChatModel(modelId);
    case "image":
      return getImageModel(modelId);
    case "audio":
      return getTTSModel(modelId);
    case "video":
      return getVideoModel(modelId);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function getModelPricing(model: AnyModel): { inputPer1M?: number } {
  if ("pricing" in model) {
    if ("inputPer1M" in model.pricing) {
      return { inputPer1M: model.pricing.inputPer1M };
    }
    if ("perImage" in model.pricing) {
      return { inputPer1M: (model.pricing.perImage ?? 0) * 1000 };
    }
    if ("perCharacter" in model.pricing) {
      return { inputPer1M: (model.pricing.perCharacter ?? 0) * 1_000_000 };
    }
    if ("perMinuteGeneration" in model.pricing) {
      return { inputPer1M: (model.pricing.perMinuteGeneration ?? 0) * 100 };
    }
  }
  return { inputPer1M: 0 };
}

export const ModelSelector = memo(
  forwardRef<HTMLButtonElement, ModelSelectorProps>(
    function ModelSelectorComponent(
      { value, onValueChange, type = "chat", disabled, className },
      ref
    ) {
      const [open, setOpen] = useState(false);
      const [search, setSearch] = useState("");

      const models = useMemo(() => getModelsForType(type), [type]);
      const selectedModel = useMemo(
        () => getModelForType(type, value),
        [type, value]
      );

      const modelsByProvider = useMemo(() => {
        const grouped = new Map<ProviderId, AnyModel[]>();
        for (const model of models) {
          const existing = grouped.get(model.provider) ?? [];
          grouped.set(model.provider, [...existing, model]);
        }
        return grouped;
      }, [models]);

      const filteredByProvider = useMemo(() => {
        if (!search) {
          return modelsByProvider;
        }

        const lower = search.toLowerCase();
        const filtered = new Map<ProviderId, AnyModel[]>();

        for (const [provider, providerModels] of modelsByProvider) {
          const matching = providerModels.filter(
            (m) =>
              m.name.toLowerCase().includes(lower) ||
              m.id.toLowerCase().includes(lower)
          );
          if (matching.length > 0) {
            filtered.set(provider, matching);
          }
        }
        return filtered;
      }, [modelsByProvider, search]);

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
              aria-controls="model-selector-list"
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
                  <span className="truncate">{selectedModel.name}</span>
                  <Badge className="shrink-0 text-[10px]" variant="outline">
                    {PROVIDER_LABELS[selectedModel.provider]}
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">Select model...</span>
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
                placeholder="Search models..."
                value={search}
              />
              <CommandList
                className="no-scrollbar max-h-[300px] overscroll-contain"
                id="model-selector-list"
              >
                <CommandEmpty>No models found.</CommandEmpty>
                {Array.from(filteredByProvider.entries()).map(
                  ([provider, providerModels]) => (
                    <CommandGroup
                      heading={PROVIDER_LABELS[provider]}
                      key={provider}
                    >
                      {providerModels.map((model) => {
                        const pricing = getModelPricing(model);
                        const bracket = getCostBracket(pricing);
                        const isSelected = model.id === value;

                        return (
                          <CommandItem
                            key={model.id}
                            onSelect={() => handleSelect(model.id)}
                            value={model.id}
                          >
                            <div className="flex w-full items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icons.Check
                                  className={cn(
                                    "size-4",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="truncate">{model.name}</span>
                              </div>
                              <span
                                className={cn(costBracketStyles({ bracket }))}
                              >
                                {formatCost(pricing)}/1M
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }
  )
);

ModelSelector.displayName = "ModelSelector";
