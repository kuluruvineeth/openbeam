"use client";

import type {
  AdvancedConditionConfig,
  ConditionNodeConfig,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Icons } from "../../../icons";
import { ConditionBuilder } from "../../condition-builder";
import { ConfigSection } from "../config-section";

interface ConditionConfigPanelProps {
  config: ConditionNodeConfig;
  onChange: (config: Partial<ConditionNodeConfig>) => void;
  fieldSuggestions?: string[];
}

export const ConditionConfigPanel = memo(
  forwardRef<HTMLDivElement, ConditionConfigPanelProps>(
    function ConditionConfigPanelComponent(
      { config, onChange, fieldSuggestions },
      ref
    ) {
      const advancedConfig: AdvancedConditionConfig = useMemo(
        () => ({
          mode: config.mode ?? "visual",
          expression: config.expression,
          branches: config.branches ?? [],
          defaultBranchLabel: config.defaultBranchLabel ?? "Default",
          evaluationOrder: config.evaluationOrder ?? "sequential",
        }),
        [
          config.mode,
          config.expression,
          config.branches,
          config.defaultBranchLabel,
          config.evaluationOrder,
        ]
      );

      const handleConfigChange = useCallback(
        (updated: AdvancedConditionConfig) => {
          onChange({
            mode: updated.mode,
            expression: updated.expression,
            branches: updated.branches,
            defaultBranchLabel: updated.defaultBranchLabel,
            evaluationOrder: updated.evaluationOrder,
          });
        },
        [onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.GitBranch className="size-4" />}
            title="Condition Logic"
          >
            <ConditionBuilder
              config={advancedConfig}
              fieldSuggestions={fieldSuggestions}
              onChange={handleConfigChange}
            />
          </ConfigSection>
        </div>
      );
    }
  )
);

ConditionConfigPanel.displayName = "ConditionConfigPanel";
