"use client";

import type { NodeStatus, Port, ToolNodeConfig } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

const VARIABLE_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

const CATEGORY_COLORS: Record<string, string> = {
  search: "text-blue-500",
  rag: "text-violet-500",
  documents: "text-emerald-500",
  connectors: "text-amber-500",
  data: "text-sky-500",
  media: "text-pink-500",
  browser: "text-orange-500",
  action: "text-red-500",
  analysis: "text-teal-500",
  integration: "text-indigo-500",
  system: "text-slate-500",
  skills: "text-purple-500",
  canvas: "text-cyan-500",
};

export interface ToolNodeData {
  label: string;
  config: ToolNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ToolNodeType = Node<ToolNodeData, "tool">;

export const ToolNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ToolNodeType>>(
    function ToolNodeComponent({ data, selected }, ref) {
      const toolId = data.config.toolId?.trim() ?? "";
      const bindings = data.config.parameterBindings ?? {};
      const bindingEntries = Object.values(bindings);
      const paramCount = bindingEntries.length;

      const bindingSummary = useMemo(() => {
        if (paramCount === 0) {
          return null;
        }
        let staticCount = 0;
        let varCount = 0;
        let aiCount = 0;
        for (const b of bindingEntries) {
          const mode = b.mode ?? "static";
          if (mode === "static") {
            staticCount += 1;
          } else if (mode === "variable") {
            varCount += 1;
          } else {
            aiCount += 1;
          }
        }
        const parts: string[] = [];
        if (staticCount > 0) {
          parts.push(`${staticCount} static`);
        }
        if (varCount > 0) {
          parts.push(`${varCount} var`);
        }
        if (aiCount > 0) {
          parts.push(`${aiCount} AI`);
        }
        return parts.join(", ");
      }, [bindingEntries, paramCount]);

      const timeoutLabel = useMemo(() => {
        const ms = data.config.timeoutMs ?? 30_000;
        const s = ms / 1000;
        return s >= 60 ? `${s / 60}m` : `${s}s`;
      }, [data.config.timeoutMs]);

      const category = data.config.toolCategory;
      const retryEnabled = data.config.retryConfig?.enabled;
      const retryMax = data.config.retryConfig?.maxAttempts ?? 3;
      const hasResultPath = !!data.config.resultPath;
      const hasResultVariable = !!data.config.resultVariable;

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!toolId) {
          list.push("Tool ID required");
        }
        if (data.config.resultPath?.trim()?.startsWith("$")) {
          list.push("Result path should not include $");
        }
        if (data.config.resultVariable?.trim()) {
          const variable = data.config.resultVariable.trim();
          if (!VARIABLE_NAME_REGEX.test(variable)) {
            list.push("Variable name must be valid");
          }
        }
        return list;
      }, [data.config.resultPath, data.config.resultVariable, toolId]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (paramCount === 0) {
          list.push("Input payload passes directly");
        }
        const aiCount = bindingEntries.filter(
          (binding) => (binding.mode ?? "static") === "ai_inferred"
        ).length;
        if (aiCount > 0) {
          list.push(`AI infers ${aiCount} param${aiCount > 1 ? "s" : ""}`);
        }
        if (retryEnabled) {
          list.push(`Retry ${retryMax}x`);
        }
        if (hasResultPath) {
          list.push("Result path enabled");
        }
        if (hasResultVariable) {
          list.push("Result variable set");
        }
        if (data.config.continueOnError) {
          list.push("Continue on error enabled");
        }
        return list;
      }, [
        bindingEntries,
        data.config.continueOnError,
        hasResultPath,
        hasResultVariable,
        paramCount,
        retryEnabled,
        retryMax,
      ]);

      return (
        <NodeShell
          handles={[
            { type: "target", position: Position.Left },
            { type: "source", position: Position.Right },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-integration"
            icon={<Icons.Wrench size={20} />}
            subtitle={data.config.toolId || "Select tool"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {category && (
                  <span
                    className={`font-mono font-semibold text-xs ${CATEGORY_COLORS[category] ?? "text-muted-foreground"}`}
                  >
                    {category}
                  </span>
                )}
                {paramCount > 0 && (
                  <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                    {paramCount} param{paramCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {retryEnabled && (
                  <Badge className="h-4 px-1 text-[10px]" variant="outline">
                    {retryMax}x retry
                  </Badge>
                )}
                {hasResultPath && (
                  <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                    mapped
                  </Badge>
                )}
                {hasResultVariable && (
                  <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                    var
                  </Badge>
                )}
                {data.config.continueOnError && (
                  <Badge className="h-4 px-1 text-[10px]" variant="outline">
                    safe
                  </Badge>
                )}
              </div>
              {bindingSummary && (
                <p className="truncate font-mono text-muted-foreground/70 text-xs">
                  {bindingSummary}
                </p>
              )}
              {data.config.toolId && (
                <NodeField label="Timeout" mono value={timeoutLabel} />
              )}
              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((warning) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-warning"
                      key={warning}
                    >
                      <Icons.AlertCircle size={12} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {notes.length > 0 && (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      key={note}
                    >
                      <Icons.Info size={12} />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ToolNode.displayName = "ToolNode";

export function createToolNodeData(): ToolNodeData {
  return {
    label: "Tool",
    config: {
      toolId: "",
      parameterBindings: {},
      timeoutMs: 30_000,
      continueOnError: false,
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: false }],
    outputs: [{ id: "result", label: "Result", type: "data", required: true }],
  };
}
