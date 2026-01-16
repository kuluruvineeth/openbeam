"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  Brain,
  ChevronDown,
  Code2,
  Database,
  FileText,
  Globe,
  Link2,
  Search,
  Sparkles,
} from "lucide-react";
import type * as React from "react";
import { forwardRef, useCallback, useMemo } from "react";
import {
  type CapabilityId,
  useAgentStore,
  useSelectedModel,
  useToolbarExpanded,
} from "../../stores/agent-store";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../select";
import { Toggle } from "../toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

const agentToolbarVariants = cva(
  "flex items-center gap-2 rounded-lg border bg-background p-2",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-border/50 shadow-sm",
        minimal: "border-transparent bg-transparent p-0",
      },
      size: {
        default: "min-h-[48px]",
        sm: "min-h-[40px] p-1.5",
        lg: "min-h-[56px] p-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ModelOption = {
  id: string;
  name: string;
  provider: string;
  badge?: string;
};

type ProviderGroup = {
  provider: string;
  models: ModelOption[];
};

const DEFAULT_MODELS: ModelOption[] = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "anthropic",
    badge: "Most Capable",
  },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "openai" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai" },
  { id: "gpt-5.2", name: "GPT-5.2", provider: "openai", badge: "Latest" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
];

const CAPABILITY_ICONS: Record<
  CapabilityId,
  React.ComponentType<{ className?: string }>
> = {
  search: Search,
  rag: Sparkles,
  documents: FileText,
  connectors: Link2,
  memory: Brain,
  web: Globe,
  code: Code2,
  data: Database,
};

type AgentToolbarProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentToolbarVariants> & {
    models?: ModelOption[];
    showModelSelector?: boolean;
    showCapabilities?: boolean;
    visibleCapabilities?: CapabilityId[];
    onModelChange?: (modelId: string) => void;
    onCapabilityToggle?: (capabilityId: CapabilityId, enabled: boolean) => void;
  };

const AgentToolbar = forwardRef<HTMLDivElement, AgentToolbarProps>(
  (
    {
      className,
      variant,
      size,
      models = DEFAULT_MODELS,
      showModelSelector = true,
      showCapabilities = true,
      visibleCapabilities,
      onModelChange,
      onCapabilityToggle,
      ...props
    },
    ref
  ) => {
    const selectedModelId = useSelectedModel();
    const isExpanded = useToolbarExpanded();
    const { selectModel, toggleCapability, capabilities, toggleToolbar } =
      useAgentStore();

    const handleModelChange = useCallback(
      (modelId: string) => {
        selectModel(modelId);
        onModelChange?.(modelId);
      },
      [selectModel, onModelChange]
    );

    const handleCapabilityToggle = useCallback(
      (capabilityId: CapabilityId) => {
        const wasEnabled = capabilities[capabilityId]?.isEnabled ?? false;
        toggleCapability(capabilityId);
        onCapabilityToggle?.(capabilityId, !wasEnabled);
      },
      [toggleCapability, capabilities, onCapabilityToggle]
    );

    const groupedModels = useMemo<ProviderGroup[]>(() => {
      const groups: Record<string, ModelOption[]> = {};
      for (const model of models) {
        const existing = groups[model.provider];
        if (existing) {
          existing.push(model);
        } else {
          groups[model.provider] = [model];
        }
      }
      return Object.entries(groups).map(([provider, groupModels]) => ({
        provider,
        models: groupModels,
      }));
    }, [models]);

    const selectedModel = useMemo(
      () => models.find((m) => m.id === selectedModelId),
      [models, selectedModelId]
    );

    const filteredCapabilities = useMemo(() => {
      const allCapabilities = Object.values(capabilities);
      if (!visibleCapabilities) {
        return allCapabilities;
      }
      return allCapabilities.filter((c) => visibleCapabilities.includes(c.id));
    }, [capabilities, visibleCapabilities]);

    return (
      <div
        className={cn(agentToolbarVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {showModelSelector && (
          <Select onValueChange={handleModelChange} value={selectedModelId}>
            <SelectTrigger className="h-8 w-[180px] rounded-md text-xs">
              <SelectValue>{selectedModel?.name ?? "Select model"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {groupedModels.map((group) => (
                <SelectGroup key={group.provider}>
                  <SelectLabel className="text-xs capitalize">
                    {group.provider}
                  </SelectLabel>
                  {group.models.map((model) => (
                    <SelectItem
                      className="text-xs"
                      key={model.id}
                      value={model.id}
                    >
                      <span className="flex items-center gap-2">
                        {model.name}
                        {model.badge && (
                          <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary">
                            {model.badge}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}

        {showCapabilities && (
          <>
            <div className="h-4 w-px bg-border" />
            <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-1">
                {filteredCapabilities.map((capability) => {
                  const Icon = CAPABILITY_ICONS[capability.id];
                  return (
                    <Tooltip key={capability.id}>
                      <TooltipTrigger asChild>
                        <Toggle
                          aria-label={`Toggle ${capability.name}`}
                          className="h-8 w-8 p-0"
                          onPressedChange={() =>
                            handleCapabilityToggle(capability.id)
                          }
                          pressed={capability.isEnabled}
                          size="sm"
                        >
                          <Icon className="size-4" />
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]" side="bottom">
                        <p className="font-medium">{capability.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {capability.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </>
        )}

        <div className="flex-1" />

        <Button
          aria-label={isExpanded ? "Collapse toolbar" : "Expand toolbar"}
          className="h-8 w-8 p-0"
          onClick={toggleToolbar}
          size="sm"
          variant="ghost"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </Button>
      </div>
    );
  }
);
AgentToolbar.displayName = "AgentToolbar";

export { AgentToolbar, agentToolbarVariants };
export type { AgentToolbarProps, ModelOption, ProviderGroup };
