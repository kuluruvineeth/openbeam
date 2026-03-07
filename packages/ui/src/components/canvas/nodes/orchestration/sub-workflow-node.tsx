"use client";

import type {
  NodeStatus,
  Port,
  SubWorkflowInputMode,
  SubWorkflowNodeConfig,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface SubWorkflowNodeData {
  label: string;
  config: SubWorkflowNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type SubWorkflowNodeType = Node<SubWorkflowNodeData, "sub_workflow">;

function formatTimeout(timeoutMs: number | undefined): string {
  if (!timeoutMs) {
    return "No limit";
  }
  if (timeoutMs >= 60_000) {
    return `${Math.round(timeoutMs / 60_000)}m`;
  }
  return `${Math.round(timeoutMs / 1000)}s`;
}

function formatInputMode(mode: SubWorkflowInputMode): string {
  if (mode === "json") {
    return "JSON";
  }
  if (mode === "passthrough") {
    return "Pass";
  }
  return "Fields";
}

function ExecutionBadge({ wait }: { wait: boolean }) {
  return (
    <Badge variant="node-info">
      <Icons.Clock size={12} />
      <span>{wait ? "Sync" : "Async"}</span>
    </Badge>
  );
}

export const SubWorkflowNode = memo(
  forwardRef<HTMLDivElement, NodeProps<SubWorkflowNodeType>>(
    function SubWorkflowNodeComponent({ data, selected }, ref) {
      const workflowId = data.config.workflowId.trim();
      let workflowDisplay = "Not set";
      if (workflowId) {
        workflowDisplay =
          workflowId.length > 14 ? `${workflowId.slice(0, 14)}...` : workflowId;
      }
      const inputMode = data.config.inputMode ?? "fields";
      const inputMappingsCount = Object.keys(
        data.config.inputMappings ?? {}
      ).length;
      const outputMappingsCount = Object.keys(
        data.config.outputMappings ?? {}
      ).length;
      const waitForCompletion = data.config.waitForCompletion ?? true;
      const timeoutDisplay = waitForCompletion
        ? formatTimeout(data.config.timeoutMs)
        : "—";
      const needsWorkflow = workflowId.length === 0;
      const needsMappings = inputMode === "fields" && inputMappingsCount === 0;
      const hasVersion = Boolean(data.config.version?.trim());

      const notes = useMemo(() => {
        const list: string[] = [];
        if (!waitForCompletion) {
          list.push("Async returns execution metadata only");
        }
        if (waitForCompletion && outputMappingsCount > 0) {
          list.push(
            `${outputMappingsCount} output mapping${
              outputMappingsCount > 1 ? "s" : ""
            }`
          );
        }
        if (inputMode === "passthrough") {
          list.push("Passes input/context through");
        }
        if (inputMode === "json") {
          list.push("JSON mode expects an object payload");
        }
        if (!data.config.inheritContext) {
          list.push("Context not inherited");
        }
        if (hasVersion) {
          list.push("Version pinned");
        }
        if (waitForCompletion && data.config.timeoutMs) {
          list.push(`Timeout ${timeoutDisplay}`);
        }
        return list;
      }, [
        data.config.inheritContext,
        data.config.timeoutMs,
        hasVersion,
        inputMode,
        outputMappingsCount,
        timeoutDisplay,
        waitForCompletion,
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
            actions={<ExecutionBadge wait={waitForCompletion} />}
            colorVar="--node-orchestration"
            icon={<Icons.Workflow size={20} />}
            subtitle="Sub-Workflow"
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Workflow" mono={!needsWorkflow}>
                <span
                  className={cn(
                    needsWorkflow && "text-warning",
                    !needsWorkflow && "font-mono tabular-nums"
                  )}
                >
                  {workflowDisplay}
                </span>
              </NodeField>
              {data.config.version && (
                <NodeField label="Version" mono value={data.config.version} />
              )}
              <NodeField
                label="Input Mode"
                value={formatInputMode(inputMode)}
              />
              <NodeField label="Input Mappings">
                <span
                  className={cn(
                    needsMappings && "text-warning",
                    "font-mono tabular-nums"
                  )}
                >
                  {inputMappingsCount}
                </span>
              </NodeField>
              {waitForCompletion && (
                <NodeField label="Output Mappings">
                  <span className="font-mono tabular-nums">
                    {outputMappingsCount}
                  </span>
                </NodeField>
              )}
              <NodeField label="Timeout" value={timeoutDisplay} />
              <NodeField
                label="Inherit Context"
                value={data.config.inheritContext ? "Yes" : "No"}
              />
              {needsWorkflow && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Workflow ID required</span>
                </div>
              )}
              {needsMappings && (
                <div className="flex items-center gap-1.5 text-[10px] text-warning">
                  <Icons.AlertCircle size={12} />
                  <span>Input mappings required</span>
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

SubWorkflowNode.displayName = "SubWorkflowNode";

export function createSubWorkflowNodeData(): SubWorkflowNodeData {
  return {
    label: "Sub-Workflow",
    config: {
      workflowId: "",
      waitForCompletion: true,
      inheritContext: true,
      inputMode: "passthrough",
      retryOnFailure: false,
      maxRetries: 3,
    },
    inputs: [
      { id: "context", label: "Context", type: "data", required: false },
    ],
    outputs: [
      { id: "result", label: "Result", type: "data", required: true },
      { id: "completed", label: "Completed", type: "control", required: true },
    ],
  };
}
