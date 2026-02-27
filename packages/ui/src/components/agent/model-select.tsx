"use client";

import type { ChatModel } from "@openplane/types/ai";
import { CHAT_MODELS } from "@openplane/types/ai";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../command";
import { Icons } from "../icons";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
  AnthropicIcon,
  AzureIcon,
  DefaultProviderIcon,
  GeminiIcon,
  OllamaIcon,
  OpenAIIcon,
} from "../provider-icons";

type ModelProviderId = ChatModel["provider"];

type IconProps = { size?: number; className?: string };

const PROVIDER_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  google: GeminiIcon,
  azure: AzureIcon,
  ollama: OllamaIcon,
};

const modelSelectVariants = cva("inline-flex items-center justify-between", {
  variants: {
    size: {
      default: "h-9 px-3 text-sm",
      sm: "h-8 px-2 text-xs",
      lg: "h-10 px-4 text-sm",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface ModelSelectProps
  extends VariantProps<typeof modelSelectVariants> {
  value?: string;
  onValueChange?: (modelId: string) => void;
  models?: ChatModel[];
  placeholder?: string;
  disabled?: boolean;
  showProviderIcon?: boolean;
  showBadges?: boolean;
  className?: string;
  triggerClassName?: string;
}

const PROVIDER_NAMES: Record<ModelProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  azure: "Azure",
  ollama: "Ollama",
  twelvelabs: "TwelveLabs",
  cohere: "Cohere",
  voyage: "Voyage",
  openplane: "OpenPlane",
  elevenlabs: "ElevenLabs",
  cartesia: "Cartesia",
  playht: "PlayHT",
  deepgram: "Deepgram",
  assemblyai: "AssemblyAI",
  stability: "Stability AI",
  blackforestlabs: "Black Forest Labs",
  runway: "Runway",
  jina: "Jina",
};

function getModelBadge(model: ChatModel): string | undefined {
  if (model.id.includes("opus")) {
    return "Most Capable";
  }
  if (model.id.includes("flash") || model.id.includes("mini")) {
    return "Fast";
  }
  if (model.pricing.inputPer1M < 1) {
    return "Affordable";
  }
  return;
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${Math.round(tokens / 1_000_000)}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
}

export const ModelSelect = forwardRef<HTMLButtonElement, ModelSelectProps>(
  (
    {
      value,
      onValueChange,
      models = CHAT_MODELS,
      placeholder = "Select model",
      disabled = false,
      showProviderIcon = true,
      showBadges = true,
      size,
      className,
      triggerClassName,
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);

    const groupedModels = useMemo(() => {
      const groups: Record<string, ChatModel[]> = {};
      for (const model of models) {
        const existing = groups[model.provider];
        if (existing) {
          existing.push(model);
        } else {
          groups[model.provider] = [model];
        }
      }
      return Object.entries(groups).map(([provider, providerModels]) => ({
        provider: provider as ModelProviderId,
        models: providerModels,
      }));
    }, [models]);

    const selectedModel = useMemo(
      () => models.find((m) => m.id === value),
      [models, value]
    );

    const handleSelect = (modelId: string) => {
      onValueChange?.(modelId);
      setOpen(false);
    };

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-controls="model-select-list"
            aria-expanded={open}
            aria-label="Select AI model"
            className={cn(
              modelSelectVariants({ size }),
              "w-[200px] gap-2",
              triggerClassName
            )}
            disabled={disabled}
            ref={ref}
            role="combobox"
            variant="outline"
          >
            {selectedModel ? (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {showProviderIcon && (
                  <ProviderIconSmall provider={selectedModel.provider} />
                )}
                <span className="truncate">{selectedModel.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <Icons.ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn("w-[320px] p-0", className)}
        >
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList id="model-select-list">
              <CommandEmpty>No models found.</CommandEmpty>
              {groupedModels.map((group) => (
                <CommandGroup
                  heading={
                    <span className="flex items-center gap-2">
                      <ProviderIconSmall provider={group.provider} />
                      {PROVIDER_NAMES[group.provider]}
                    </span>
                  }
                  key={group.provider}
                >
                  {group.models.map((model) => {
                    const badge = showBadges ? getModelBadge(model) : undefined;
                    return (
                      <CommandItem
                        key={model.id}
                        onSelect={() => handleSelect(model.id)}
                        value={`${model.provider} ${model.name} ${model.id}`}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            {badge && (
                              <span className="flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 font-medium text-[10px] text-primary">
                                {badge === "Fast" && (
                                  <Icons.Zap className="size-2.5" />
                                )}
                                {badge === "Most Capable" && (
                                  <Icons.Sparkles className="size-2.5" />
                                )}
                                {badge}
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {formatContextWindow(model.contextWindow)} context
                            {model.supportsVision && " · Vision"}
                            {model.supportsTools && " · Tools"}
                          </span>
                        </div>
                        <Icons.Check
                          className={cn(
                            "size-4 shrink-0",
                            value === model.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);
ModelSelect.displayName = "ModelSelect";

function ProviderIconSmall({ provider }: { provider: ModelProviderId }) {
  const Icon = PROVIDER_ICON_MAP[provider] ?? DefaultProviderIcon;
  return <Icon className="size-4 shrink-0" size={16} />;
}

export { modelSelectVariants };
