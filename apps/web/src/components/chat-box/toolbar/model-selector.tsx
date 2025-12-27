"use client";

import { useMemo } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Model = {
  labelName: string;
  description?: string;
  provider: "openai" | "google" | "anthropic" | "other";
};

type Props = {
  selectedModel: string;
  availableModels: Model[];
  onModelSelect: (model: string) => void;
};

type GroupedModels = {
  provider: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  models: Model[];
};

const getProviderIcon = (
  provider: string
): React.ComponentType<{ className?: string; size?: number }> => {
  switch (provider.toLowerCase()) {
    case "openai":
      return Icons.ChatGptIcon;
    case "google":
      return Icons.GoogleGeminiIcon;
    case "anthropic":
      return Icons.ClaudeIcon;
    default:
      return Icons.BotIcon;
  }
};

const getProviderName = (provider: string): string => {
  switch (provider.toLowerCase()) {
    case "openai":
      return "OpenAI";
    case "google":
      return "Google";
    case "anthropic":
      return "Anthropic";
    default:
      return provider;
  }
};

export function ModelSelector({
  selectedModel,
  availableModels,
  onModelSelect,
}: Props) {
  const groupedModels = useMemo(() => {
    const grouped: Record<string, Model[]> = {};
    for (const model of availableModels) {
      const provider = model.provider;
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(model);
    }

    return Object.entries(grouped).map(
      ([provider, models]): GroupedModels => ({
        provider,
        icon: getProviderIcon(provider),
        models,
      })
    );
  }, [availableModels]);

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              className="mr-2 gap-1 px-3 py-1 text-xs transition-all duration-200"
              style={{ marginLeft: "auto" }}
              variant="ghost"
            >
              <span className="whitespace-nowrap font-semibold">
                {selectedModel || "Select Model"}
              </span>
              <Icons.ChevronDownIcon
                className="ml-1 transition-transform duration-200"
                size={14}
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Select Model</p>
        </TooltipContent>
        <DropdownMenuContent
          align="start"
          className="max-h-96 w-80 border border-border bg-popover p-0 shadow-sm"
          side="bottom"
        >
          <div className="no-scrollbar max-h-80 overflow-y-auto py-2">
            {groupedModels.length > 0 ? (
              groupedModels.map((group, groupIndex) => {
                const ProviderIcon = group.icon;
                return (
                  <div key={group.provider}>
                    {groupIndex > 0 && <DropdownMenuSeparator />}
                    {/* Provider Header */}
                    <div className="border-border px-4 py-2">
                      <div className="flex items-center gap-2">
                        <ProviderIcon className="text-foreground" size={16} />
                        <span className="font-semibold text-foreground text-sm">
                          {getProviderName(group.provider)}
                        </span>
                      </div>
                    </div>
                    {/* Models */}
                    {group.models.map((model) => (
                      <DropdownMenuItem
                        className="mb-1 px-4 py-2 hover:bg-transparent focus:bg-transparent data-highlighted:bg-transparent"
                        key={model.labelName}
                        onClick={() => onModelSelect(model.labelName)}
                      >
                        <div className="flex w-full items-start gap-2 py-1">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                            {selectedModel === model.labelName && (
                              <Icons.CheckIcon
                                className="text-foreground"
                                size={14}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 flex-col">
                            <span className="font-medium text-foreground text-sm">
                              {model.labelName}
                            </span>
                            {model.description && (
                              <span className="mt-0.5 block text-muted-foreground text-xs">
                                {model.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                );
              })
            ) : (
              <DropdownMenuItem className="px-4 py-3 text-center" disabled>
                <span className="text-muted-foreground">
                  No models available
                </span>
              </DropdownMenuItem>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  );
}
