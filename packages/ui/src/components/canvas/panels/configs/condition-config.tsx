"use client";

import type {
  AdvancedConditionConfig,
  ConditionBranch,
  ConditionNodeConfig,
} from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Button } from "../../../button";
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
      const branches = config.branches ?? [];
      const missingBranches = config.mode === "visual" && branches.length === 0;
      const missingExpression =
        config.mode === "expression" && !config.expression?.trim();
      const emptyBranchCount = useMemo(
        () =>
          branches.reduce((count, branch) => {
            const conditionCount = getBranchConditionCount(branch);
            return conditionCount === 0 ? count + 1 : count;
          }, 0),
        [branches]
      );
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
            <div className="space-y-2">
              {missingBranches && (
                <div className="flex items-start justify-between gap-3 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
                  <div className="flex items-start gap-2">
                    <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      Visual mode requires at least one branch. Add a branch or
                      switch to Expression mode.
                    </span>
                  </div>
                  <Button
                    className="h-7 px-2 text-[11px]"
                    onClick={() => onChange({ mode: "expression" })}
                    size="sm"
                    variant="outline"
                  >
                    Switch
                  </Button>
                </div>
              )}
              {missingExpression && (
                <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
                  <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Expression mode requires a JavaScript expression that
                    returns a branch id, label, or boolean.
                  </span>
                </div>
              )}
              {emptyBranchCount > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
                  <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {emptyBranchCount}{" "}
                    {emptyBranchCount === 1 ? "branch has" : "branches have"} no
                    conditions and will always match.
                  </span>
                </div>
              )}
            </div>
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

function getBranchConditionCount(branch: ConditionBranch): number {
  const groups = branch.groups ?? [];
  return groups.reduce(
    (sum, group) => sum + (group.conditions?.length ?? 0),
    0
  );
}
