"use client";

import type { ConditionNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Badge } from "../../../badge";
import { Button } from "../../../button";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface ConditionBranch {
  id: string;
  label: string;
  condition: string;
}

interface ConditionConfigPanelProps {
  config: ConditionNodeConfig;
  onChange: (config: Partial<ConditionNodeConfig>) => void;
}

export const ConditionConfigPanel = memo(
  forwardRef<HTMLDivElement, ConditionConfigPanelProps>(
    function ConditionConfigPanelComponent({ config, onChange }, ref) {
      const branches = config.branches ?? [];

      const handleAddBranch = useCallback(() => {
        const newBranch: ConditionBranch = {
          id: crypto.randomUUID(),
          label: `Branch ${branches.length + 1}`,
          condition: "",
        };
        onChange({ branches: [...branches, newBranch] });
      }, [branches, onChange]);

      const handleUpdateBranch = useCallback(
        (branchId: string, updates: Partial<ConditionBranch>) => {
          const updated = branches.map((b) =>
            b.id === branchId ? { ...b, ...updates } : b
          );
          onChange({ branches: updated });
        },
        [branches, onChange]
      );

      const handleDeleteBranch = useCallback(
        (branchId: string) => {
          onChange({ branches: branches.filter((b) => b.id !== branchId) });
        },
        [branches, onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.GitBranch className="size-4" />}
            title="Condition"
          >
            <div className="space-y-4">
              <ConfigField
                label="Expression"
                required
                tooltip="JavaScript expression that evaluates to boolean"
              >
                <Input
                  className="h-9 font-mono text-sm"
                  onChange={(e) => onChange({ expression: e.target.value })}
                  placeholder="input.status === 'approved'"
                  value={config.expression ?? ""}
                />
              </ConfigField>

              <ConfigField
                label="Default Branch"
                tooltip="Branch when no condition matches"
              >
                <Input
                  className="h-9"
                  onChange={(e) =>
                    onChange({ defaultBranch: e.target.value || undefined })
                  }
                  placeholder="else"
                  value={config.defaultBranch ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            actions={
              <Button onClick={handleAddBranch} size="sm" variant="ghost">
                <Icons.Plus className="mr-1 size-3.5" />
                Add
              </Button>
            }
            badge={branches.length}
            defaultOpen
            icon={<Icons.GitMerge className="size-4" />}
            title="Branches"
          >
            <div className="space-y-3">
              {branches.map((branch, index) => (
                <div
                  className="group relative space-y-3 rounded-md border border-border/50 bg-secondary/30 p-3"
                  key={branch.id}
                >
                  <div className="flex items-center justify-between">
                    <Badge className="text-xs" variant="outline">
                      {index + 1}
                    </Badge>
                    <Button
                      className="size-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={() => handleDeleteBranch(branch.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <Icons.Trash className="size-3" />
                    </Button>
                  </div>

                  <Input
                    className="h-8 text-sm"
                    onChange={(e) =>
                      handleUpdateBranch(branch.id, { label: e.target.value })
                    }
                    placeholder="Branch label"
                    value={branch.label}
                  />

                  <Input
                    className="h-8 font-mono text-sm"
                    onChange={(e) =>
                      handleUpdateBranch(branch.id, {
                        condition: e.target.value,
                      })
                    }
                    placeholder="Condition (e.g., input.value > 100)"
                    value={branch.condition}
                  />
                </div>
              ))}

              {branches.length === 0 && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No branches defined. Add one to control the flow.
                </div>
              )}
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

ConditionConfigPanel.displayName = "ConditionConfigPanel";
