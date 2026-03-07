"use client";

import type {
  ConditionNodeConfig,
  NodeStatus,
  Port,
} from "@openbeam/types/canvas";
import { BRANCH_COLORS } from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ConditionNodeData {
  label: string;
  config: ConditionNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ConditionNodeType = Node<ConditionNodeData, "condition">;

export const ConditionNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ConditionNodeType>>(
    function ConditionNodeComponent({ data, selected }, ref) {
      const { mode, expression, branches, defaultBranchLabel } = data.config;
      const branchList = useMemo(() => branches ?? [], [branches]);
      const isVisual = (mode ?? "visual") === "visual";
      const missingBranches = isVisual && branchList.length === 0;
      const missingExpression = mode === "expression" && !expression?.trim();

      const handles = useMemo(() => {
        const totalOutputs =
          branchList.length + (defaultBranchLabel ? 1 : 0) || 2;

        const result: Array<{
          id?: string;
          type: "source" | "target";
          position: Position;
          variant?: "default" | "true" | "false" | "loop" | "done";
          offset?: string;
          label?: string;
        }> = [{ type: "target", position: Position.Left }];

        if (branchList.length === 0) {
          result.push(
            {
              id: "true",
              type: "source",
              position: Position.Right,
              offset: "35%",
              variant: "true",
              label: "Yes",
            },
            {
              id: "false",
              type: "source",
              position: Position.Right,
              offset: "65%",
              variant: "false",
              label: "No",
            }
          );
          return result;
        }

        branchList.forEach((branch, index) => {
          const offset = ((index + 1) / (totalOutputs + 1)) * 100;
          result.push({
            id: branch.id,
            type: "source",
            position: Position.Right,
            offset: `${offset}%`,
            variant: "default",
            label: branch.label || `Branch ${index + 1}`,
          });
        });

        if (defaultBranchLabel) {
          const offset = (branchList.length + 1) / (totalOutputs + 1);
          result.push({
            id: "default",
            type: "source",
            position: Position.Right,
            offset: `${offset * 100}%`,
            variant: "default",
            label: defaultBranchLabel,
          });
        }

        return result;
      }, [branchList, defaultBranchLabel]);

      const preview = useMemo(() => {
        if (mode === "expression") {
          if (!expression?.trim()) {
            return "Expression required";
          }
          return expression.length > 35
            ? `${expression.slice(0, 35)}...`
            : expression;
        }

        if (branchList.length === 0) {
          return "Add branches or use expression";
        }

        const totalConditions = branchList.reduce(
          (sum, b) =>
            sum +
            (b.groups ?? []).reduce(
              (gs, g) => gs + (g.conditions?.length ?? 0),
              0
            ),
          0
        );

        return `${branchList.length} ${branchList.length === 1 ? "branch" : "branches"} • ${totalConditions} ${totalConditions === 1 ? "condition" : "conditions"}`;
      }, [mode, expression, branchList]);

      const emptyBranchCount = useMemo(
        () =>
          branchList.reduce((count, branch) => {
            const conditionCount = (branch.groups ?? []).reduce(
              (sum, group) => sum + (group.conditions?.length ?? 0),
              0
            );
            return conditionCount === 0 ? count + 1 : count;
          }, 0),
        [branchList]
      );

      return (
        <NodeShell
          handles={handles}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-condition"
            icon={<Icons.GitBranch size={20} />}
            subtitle={mode === "expression" ? "Expression" : "Visual Logic"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                {preview}
              </div>
              {branchList.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {branchList.map((branch, index) => (
                    <div
                      className="flex items-center gap-1 rounded-sm bg-secondary/50 px-1.5 py-0.5"
                      key={branch.id}
                    >
                      <div
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            branch.color ??
                            BRANCH_COLORS[index % BRANCH_COLORS.length],
                        }}
                      />
                      <span className="truncate text-[10px]">
                        {branch.label || `Branch ${index + 1}`}
                      </span>
                    </div>
                  ))}
                  {defaultBranchLabel && (
                    <div className="flex items-center gap-1 rounded-sm bg-secondary/50 px-1.5 py-0.5">
                      <div className="size-2 rounded-full bg-muted-foreground/30" />
                      <span className="truncate text-[10px]">
                        {defaultBranchLabel}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {missingBranches && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Add a branch or switch to expression</span>
                </div>
              )}
              {missingExpression && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Expression required</span>
                </div>
              )}
              {emptyBranchCount > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>
                    {emptyBranchCount}{" "}
                    {emptyBranchCount === 1 ? "branch" : "branches"} always
                    match
                  </span>
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ConditionNode.displayName = "ConditionNode";

export function createConditionNodeData(): ConditionNodeData {
  return {
    label: "Condition",
    config: {
      mode: "visual",
      branches: [],
      defaultBranchLabel: "Default",
      evaluationOrder: "sequential",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [
      { id: "true", label: "Yes", type: "control", required: false },
      { id: "false", label: "No", type: "control", required: false },
    ],
  };
}
