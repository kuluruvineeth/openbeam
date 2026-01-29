"use client";

import type {
  MemoryReadNodeConfig,
  MemoryScope,
} from "@openplane/types/canvas";
import { cva } from "class-variance-authority";
import { memo, useCallback } from "react";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface MemoryReadConfigPanelProps {
  config: MemoryReadNodeConfig;
  onChange: (config: Partial<MemoryReadNodeConfig>) => void;
}

const SCOPES: { id: MemoryScope; label: string; icon: keyof typeof Icons }[] = [
  { id: "workflow", label: "Workflow", icon: "Workflow" },
  { id: "session", label: "Session", icon: "Repeat" },
  { id: "user", label: "User", icon: "User" },
  { id: "team", label: "Team", icon: "Users" },
  { id: "global", label: "Global", icon: "Globe" },
];

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

export const MemoryReadConfigPanel = memo(
  function MemoryReadConfigPanelComponent({
    config,
    onChange,
  }: MemoryReadConfigPanelProps) {
    return (
      <div className="divide-y divide-border/50">
        <MemoryLocationSection config={config} onChange={onChange} />
        <BehaviorSection config={config} onChange={onChange} />
      </div>
    );
  }
);

MemoryReadConfigPanel.displayName = "MemoryReadConfigPanel";

interface SectionProps {
  config: MemoryReadNodeConfig;
  onChange: (config: Partial<MemoryReadNodeConfig>) => void;
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
        <ConfigField label="Key" tooltip="Memory key to retrieve">
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) => onChange({ key: e.target.value })}
            placeholder="e.g., user_preferences"
            value={config.key ?? ""}
          />
        </ConfigField>

        <ConfigField label="Namespace" tooltip="Memory namespace to read from">
          <Input
            className="h-9"
            onChange={(e) =>
              onChange({ namespace: e.target.value || undefined })
            }
            placeholder="Optional namespace"
            value={config.namespace ?? ""}
          />
        </ConfigField>

        <ConfigField label="Scope" tooltip="Memory scope to read from">
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

const BehaviorSection = memo(function BehaviorSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const hasDefaultValue = config.defaultValue !== undefined;

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Settings2 className="size-4" />}
      title="Behavior"
    >
      <div className="space-y-4">
        <ConfigField
          label="Default Value"
          tooltip="Value to use if key not found (JSON)"
        >
          <Textarea
            className="min-h-[60px] resize-none font-mono text-sm"
            onChange={(e) => {
              const value = e.target.value;
              if (!value) {
                onChange({ defaultValue: undefined });
                return;
              }
              try {
                onChange({ defaultValue: JSON.parse(value) });
              } catch {
                onChange({ defaultValue: value });
              }
            }}
            placeholder='e.g., { "theme": "dark" }'
            value={formatDefaultValue(config.defaultValue)}
          />
        </ConfigField>

        <ConfigField
          horizontal
          label="Throw on Missing"
          tooltip="Fail workflow if key not found and no default"
        >
          <Switch
            checked={config.throwOnMissing ?? false}
            disabled={hasDefaultValue}
            onCheckedChange={(throwOnMissing) => onChange({ throwOnMissing })}
          />
        </ConfigField>

        <ConfigField
          horizontal
          label="Include Metadata"
          tooltip="Return metadata with the value"
        >
          <Switch
            checked={config.includeMetadata ?? false}
            onCheckedChange={(includeMetadata) => onChange({ includeMetadata })}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

function formatDefaultValue(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}
