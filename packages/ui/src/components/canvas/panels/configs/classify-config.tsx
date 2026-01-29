"use client";

import type {
  ClassificationMode,
  ClassifyNodeConfig,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
import {
  CategoryListEditor,
  ClassificationModeSelector,
  ConfidenceThresholdSlider,
  FallbackBehaviorSelector,
  ModelSelector,
} from "../../ai-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface ClassifyConfigPanelProps {
  config: ClassifyNodeConfig;
  onChange: (config: Partial<ClassifyNodeConfig>) => void;
}

function getModeDescription(
  mode: ClassificationMode | undefined
): string | null {
  if (mode === "routing") {
    return "Routing mode creates dynamic output handles for each category, allowing you to branch your workflow based on classification.";
  }
  if (mode === "zero_shot") {
    return "Zero-shot mode classifies without examples. Just provide category names and descriptions.";
  }
  return null;
}

export const ClassifyConfigPanel = memo(
  forwardRef<HTMLDivElement, ClassifyConfigPanelProps>(
    function ClassifyConfigPanelComponent({ config, onChange }, ref) {
      const handleCategoriesChange = useCallback(
        (categories: ClassifyNodeConfig["categories"]) => {
          onChange({ categories });
        },
        [onChange]
      );

      const handleModeChange = useCallback(
        (mode: ClassifyNodeConfig["mode"]) => {
          onChange({ mode });
        },
        [onChange]
      );

      const handleFallbackChange = useCallback(
        (fallbackBehavior: ClassifyNodeConfig["fallbackBehavior"]) => {
          onChange({ fallbackBehavior });
        },
        [onChange]
      );

      const handleConfidenceChange = useCallback(
        (confidenceThreshold: number) => {
          onChange({ confidenceThreshold });
        },
        [onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.Tags className="size-4" />}
            title="Classification Mode"
          >
            <div className="space-y-4">
              <ConfigField
                label="Mode"
                tooltip="Categories: Assign labels. Routing: Branch workflow. Zero-shot: No examples needed."
              >
                <ClassificationModeSelector
                  onChange={handleModeChange}
                  value={config.mode ?? "categories"}
                />
              </ConfigField>

              <AnimatedSizeContainer height>
                {getModeDescription(config.mode) && (
                  <p className="text-muted-foreground text-xs">
                    {getModeDescription(config.mode)}
                  </p>
                )}
              </AnimatedSizeContainer>
            </div>
          </ConfigSection>

          <ConfigSection
            badge={config.categories?.length ?? 0}
            defaultOpen
            icon={<Icons.ListTree className="size-4" />}
            title="Categories"
          >
            <CategoryListEditor
              categories={config.categories ?? []}
              onChange={handleCategoriesChange}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.BotIcon className="size-4" />}
            title="Model"
          >
            <div className="space-y-4">
              <ConfigField label="Model">
                <ModelSelector
                  onValueChange={(model) => onChange({ model })}
                  type="chat"
                  value={config.model ?? "claude-sonnet-4-20250514"}
                />
              </ConfigField>

              <ConfigField
                label="Temperature"
                tooltip="Lower values (0.1) for consistent results, higher for variety"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={1}
                    min={0}
                    onValueChange={(v) => onChange({ temperature: v[0] })}
                    step={0.1}
                    value={[config.temperature ?? 0.1]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.temperature ?? 0.1).toFixed(1)}
                  </span>
                </div>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Percent className="size-4" />}
            title="Classification Options"
          >
            <div className="space-y-4">
              <ConfigField label="Multi-Label">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Allow multiple categories per input
                  </span>
                  <Switch
                    checked={config.allowMultiple ?? false}
                    onCheckedChange={(allowMultiple) =>
                      onChange({ allowMultiple })
                    }
                  />
                </div>
              </ConfigField>

              <ConfigField
                label="Confidence Threshold"
                tooltip="Minimum confidence score required for classification"
              >
                <ConfidenceThresholdSlider
                  onChange={handleConfidenceChange}
                  value={config.confidenceThreshold ?? 0.7}
                />
              </ConfigField>

              <ConfigField label="Include Confidence">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Output confidence scores with results
                  </span>
                  <Switch
                    checked={config.includeConfidence ?? false}
                    onCheckedChange={(includeConfidence) =>
                      onChange({ includeConfidence })
                    }
                  />
                </div>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.AlertCircle className="size-4" />}
            title="Fallback Handling"
          >
            <div className="space-y-4">
              <ConfigField
                label="Fallback Behavior"
                tooltip="What to do when classification confidence is below threshold"
              >
                <FallbackBehaviorSelector
                  onChange={handleFallbackChange}
                  value={config.fallbackBehavior ?? "other_branch"}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings className="size-4" />}
            title="Advanced"
          >
            <div className="space-y-4">
              <ConfigField
                label="System Prompt Template"
                tooltip="Custom instructions for the classifier"
              >
                <Textarea
                  className="min-h-[100px] resize-y text-sm"
                  onChange={(e) =>
                    onChange({
                      systemPromptTemplate: e.target.value || undefined,
                    })
                  }
                  placeholder="Custom classification instructions..."
                  value={config.systemPromptTemplate ?? ""}
                />
              </ConfigField>

              <ConfigField
                label="Additional Instructions"
                tooltip="Extra guidance for classification"
              >
                <Textarea
                  className="min-h-[80px] resize-y text-sm"
                  onChange={(e) =>
                    onChange({ instructions: e.target.value || undefined })
                  }
                  placeholder="Additional context or rules..."
                  value={config.instructions ?? ""}
                />
              </ConfigField>

              <ConfigField label="Auto-Fix">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Automatically correct malformed outputs
                  </span>
                  <Switch
                    checked={config.enableAutoFix ?? true}
                    onCheckedChange={(enableAutoFix) =>
                      onChange({ enableAutoFix })
                    }
                  />
                </div>
              </ConfigField>

              <ConfigField label="Memory">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Use conversation history for context
                  </span>
                  <Switch
                    checked={config.enableMemory ?? false}
                    onCheckedChange={(enableMemory) =>
                      onChange({ enableMemory })
                    }
                  />
                </div>
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

ClassifyConfigPanel.displayName = "ClassifyConfigPanel";
