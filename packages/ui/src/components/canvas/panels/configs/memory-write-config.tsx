"use client";

import type {
  MemoryEncoding,
  MemoryScope,
  MemoryType,
  MemoryWriteNodeConfig,
} from "@openplane/types/canvas";
import { cva } from "class-variance-authority";
import { memo, useCallback, useMemo } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface MemoryWriteConfigPanelProps {
  config: MemoryWriteNodeConfig;
  onChange: (config: Partial<MemoryWriteNodeConfig>) => void;
}

const SCOPES: { id: MemoryScope; label: string; icon: keyof typeof Icons }[] = [
  { id: "workflow", label: "Workflow", icon: "Workflow" },
  { id: "session", label: "Session", icon: "Repeat" },
  { id: "user", label: "User", icon: "User" },
  { id: "team", label: "Team", icon: "Users" },
  { id: "global", label: "Global", icon: "Globe" },
];

const MEMORY_TYPES: {
  id: MemoryType;
  label: string;
  description: string;
  icon: keyof typeof Icons;
}[] = [
  {
    id: "semantic",
    label: "Semantic",
    description: "Facts, knowledge, relationships",
    icon: "BrainIcon",
  },
  {
    id: "episodic",
    label: "Episodic",
    description: "Events, interactions, history",
    icon: "Clock",
  },
  {
    id: "procedural",
    label: "Procedural",
    description: "Skills, learned behaviors",
    icon: "Settings2",
  },
];

const ENCODINGS: { id: MemoryEncoding; label: string; description: string }[] =
  [
    { id: "json", label: "JSON", description: "Structured data" },
    { id: "text", label: "Text", description: "Plain text" },
    { id: "embedding", label: "Embedding", description: "Vector embedding" },
  ];

const TTL_PRESETS = [
  { label: "None", value: undefined },
  { label: "1 hour", value: 3_600_000 },
  { label: "24 hours", value: 86_400_000 },
  { label: "7 days", value: 604_800_000 },
  { label: "30 days", value: 2_592_000_000 },
] as const;

const scopeCardVariants = cva(
  "flex cursor-pointer flex-col items-center gap-1.5 rounded-md border px-3 py-2.5 transition-colors",
  {
    variants: {
      selected: {
        true: "border-[var(--node-memory)] bg-[var(--node-memory)]/10",
        false: "border-border/50 hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

const typeCardVariants = cva(
  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors",
  {
    variants: {
      selected: {
        true: "border-[var(--node-memory)] bg-[var(--node-memory)]/10",
        false: "border-border/50 hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export const MemoryWriteConfigPanel = memo(
  function MemoryWriteConfigPanelComponent({
    config,
    onChange,
  }: MemoryWriteConfigPanelProps) {
    const warnings = useMemo(() => {
      const list: string[] = [];
      if (!config.key?.trim()) {
        list.push("Key is required");
      }
      if (config.ttlMs !== undefined && config.ttlMs <= 0) {
        list.push("TTL must be greater than 0");
      }
      return list;
    }, [config.key, config.ttlMs]);

    const notes = useMemo(() => {
      const list: string[] = [];
      if (config.namespace?.trim()) {
        list.push("Namespace scoped");
      }
      if (config.generateEmbedding) {
        list.push("Embedding generated on write");
      }
      if (config.encoding === "embedding") {
        list.push("Embedding input uses vector or content");
      }
      if (config.overwrite === false) {
        list.push("Writes skip existing values");
      }
      if (config.tags && config.tags.length > 0) {
        list.push(`${config.tags.length} tags`);
      }
      return list;
    }, [
      config.encoding,
      config.generateEmbedding,
      config.namespace,
      config.overwrite,
      config.tags,
    ]);

    return (
      <div className="divide-y divide-border/50">
        <MemoryLocationSection config={config} onChange={onChange} />
        <MemoryTypeSection config={config} onChange={onChange} />
        <ExpirationSection config={config} onChange={onChange} />
        <OrganizationSection config={config} onChange={onChange} />
        <WarningsList items={warnings} />
        <NotesList items={notes} />
      </div>
    );
  }
);

MemoryWriteConfigPanel.displayName = "MemoryWriteConfigPanel";

interface SectionProps {
  config: MemoryWriteNodeConfig;
  onChange: (config: Partial<MemoryWriteNodeConfig>) => void;
}

const MemoryLocationSection = memo(function MemoryLocationSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const handleScopeChange = useCallback(
    (scope: MemoryScope) => {
      onChange({ scope });
    },
    [onChange]
  );

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Database className="size-4" />}
      title="Memory Location"
    >
      <div className="space-y-4">
        <ConfigField label="Key" tooltip="Unique identifier for this memory">
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) => onChange({ key: e.target.value })}
            placeholder="e.g., user_preferences"
            value={config.key ?? ""}
          />
        </ConfigField>

        <ConfigField
          label="Namespace"
          tooltip="Group related memories together"
        >
          <Input
            className="h-9"
            onChange={(e) =>
              onChange({ namespace: e.target.value || undefined })
            }
            placeholder="Optional namespace"
            value={config.namespace ?? ""}
          />
        </ConfigField>

        <ConfigField label="Scope" tooltip="Memory visibility and lifetime">
          <div className="grid grid-cols-5 gap-1.5">
            {SCOPES.map((scope) => {
              const Icon = Icons[scope.icon];
              return (
                <button
                  className={scopeCardVariants({
                    selected: config.scope === scope.id,
                  })}
                  key={scope.id}
                  onClick={() => handleScopeChange(scope.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  <span className="font-medium text-[10px]">{scope.label}</span>
                </button>
              );
            })}
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const MemoryTypeSection = memo(function MemoryTypeSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const handleTypeChange = useCallback(
    (memoryType: MemoryType) => {
      onChange({ memoryType });
    },
    [onChange]
  );

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.BrainIcon className="size-4" />}
      title="Memory Type"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {MEMORY_TYPES.map((type) => {
            const Icon = Icons[type.icon];
            return (
              <button
                className={typeCardVariants({
                  selected: config.memoryType === type.id,
                })}
                key={type.id}
                onClick={() => handleTypeChange(type.id)}
                type="button"
              >
                <Icon className="size-4 shrink-0" />
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{type.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {type.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <ConfigField label="Encoding" tooltip="How the value is stored">
          <Select
            onValueChange={(encoding) =>
              onChange({ encoding: encoding as MemoryEncoding })
            }
            value={config.encoding ?? "json"}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCODINGS.map((enc) => (
                <SelectItem key={enc.id} value={enc.id}>
                  <div className="flex flex-col">
                    <span>{enc.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {enc.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigField>

        <ConfigField
          horizontal
          label="Generate Embedding"
          tooltip="Create vector embedding for semantic search"
        >
          <Switch
            checked={config.generateEmbedding ?? false}
            onCheckedChange={(generateEmbedding) =>
              onChange({ generateEmbedding })
            }
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const ExpirationSection = memo(function ExpirationSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const currentTtl = config.ttlMs;
  const isCustomTtl =
    currentTtl !== undefined &&
    !TTL_PRESETS.some((p) => p.value === currentTtl);

  return (
    <ConfigSection
      badge={currentTtl ? formatTtl(currentTtl) : "None"}
      defaultOpen={false}
      icon={<Icons.Clock className="size-4" />}
      title="Expiration"
    >
      <div className="space-y-4">
        <ConfigField label="Time to Live">
          <Select
            onValueChange={(value) =>
              onChange({
                ttlMs: value === "none" ? undefined : Number(value),
              })
            }
            value={isCustomTtl ? "custom" : String(currentTtl ?? "none")}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TTL_PRESETS.map((preset) => (
                <SelectItem
                  key={preset.label}
                  value={
                    preset.value === undefined ? "none" : String(preset.value)
                  }
                >
                  {preset.label}
                </SelectItem>
              ))}
              {isCustomTtl && currentTtl !== undefined && (
                <SelectItem value="custom">
                  Custom ({formatTtl(currentTtl)})
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </ConfigField>

        <AnimatedSizeContainer height>
          {isCustomTtl && (
            <ConfigField label="Custom TTL (hours)">
              <div className="flex items-center gap-4">
                <Slider
                  className="flex-1"
                  max={720}
                  min={1}
                  onValueChange={(v) =>
                    onChange({ ttlMs: (v[0] ?? 1) * 3_600_000 })
                  }
                  step={1}
                  value={[Math.round((currentTtl ?? 3_600_000) / 3_600_000)]}
                />
                <span className="w-12 text-right font-mono text-sm tabular-nums">
                  {Math.round((currentTtl ?? 3_600_000) / 3_600_000)}h
                </span>
              </div>
            </ConfigField>
          )}
        </AnimatedSizeContainer>

        <ConfigField
          horizontal
          label="Overwrite"
          tooltip="Replace existing value if key exists"
        >
          <Switch
            checked={config.overwrite ?? true}
            onCheckedChange={(overwrite) => onChange({ overwrite })}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

const OrganizationSection = memo(function OrganizationSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const tagsCount = config.tags?.length ?? 0;

  return (
    <ConfigSection
      badge={tagsCount > 0 ? tagsCount : undefined}
      defaultOpen={false}
      icon={<Icons.Tags className="size-4" />}
      title="Organization"
    >
      <div className="space-y-4">
        <ConfigField label="Tags" tooltip="Comma-separated list of tags">
          <Input
            className="h-9"
            onChange={(e) => {
              const value = e.target.value;
              const tags = value
                ? value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                : undefined;
              onChange({ tags });
            }}
            placeholder="e.g., preferences, settings"
            value={config.tags?.join(", ") ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

function formatTtl(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = hours / 24;
  if (days < 7) {
    return `${days}d`;
  }
  const weeks = Math.round(days / 7);
  return `${weeks}w`;
}
