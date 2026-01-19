"use client";

import type { LoopNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo } from "react";
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
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const LOOP_TYPES = [
  { id: "forEach", name: "For Each", description: "Iterate over array items" },
  { id: "while", name: "While", description: "Loop while condition is true" },
  { id: "times", name: "Times", description: "Fixed number of iterations" },
] as const;

interface LoopConfigPanelProps {
  config: LoopNodeConfig;
  onChange: (config: Partial<LoopNodeConfig>) => void;
}

export const LoopConfigPanel = memo(
  forwardRef<HTMLDivElement, LoopConfigPanelProps>(
    function LoopConfigPanelComponent({ config, onChange }, ref) {
      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.RefreshCw className="size-4" />}
            title="Loop Type"
          >
            <div className="space-y-4">
              <ConfigField label="Type" required>
                <Select
                  onValueChange={(type) =>
                    onChange({ type: type as LoopNodeConfig["type"] })
                  }
                  value={config.type ?? "forEach"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOOP_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex flex-col">
                          <span>{type.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {type.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              {config.type === "forEach" && (
                <ConfigField
                  label="Collection"
                  tooltip="Path to the array to iterate"
                >
                  <Input
                    className="h-9 font-mono text-sm"
                    onChange={(e) => onChange({ collection: e.target.value })}
                    placeholder="input.items"
                    value={config.collection ?? ""}
                  />
                </ConfigField>
              )}

              {config.type === "while" && (
                <ConfigField
                  label="Condition"
                  tooltip="Continue while this is true"
                >
                  <Input
                    className="h-9 font-mono text-sm"
                    onChange={(e) => onChange({ condition: e.target.value })}
                    placeholder="index < 10 && !done"
                    value={config.condition ?? ""}
                  />
                </ConfigField>
              )}

              {config.type === "times" && (
                <ConfigField label="Iterations">
                  <div className="flex items-center gap-4">
                    <Slider
                      className="flex-1"
                      max={100}
                      min={1}
                      onValueChange={(v) => onChange({ times: v[0] })}
                      step={1}
                      value={[config.times ?? 10]}
                    />
                    <span className="w-8 text-right font-mono text-sm tabular-nums">
                      {config.times ?? 10}
                    </span>
                  </div>
                </ConfigField>
              )}
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings2 className="size-4" />}
            title="Safety"
          >
            <div className="space-y-4">
              <ConfigField
                label="Max Iterations"
                tooltip="Safety limit to prevent infinite loops"
              >
                <Input
                  className="h-9 font-mono"
                  max={10_000}
                  min={1}
                  onChange={(e) =>
                    onChange({
                      maxIterations: Number.parseInt(e.target.value, 10) || 100,
                    })
                  }
                  type="number"
                  value={config.maxIterations ?? 100}
                />
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

LoopConfigPanel.displayName = "LoopConfigPanel";
