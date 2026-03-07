"use client";

import type {
  AgentCallNodeConfig,
  NodeStatus,
  Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface AgentCallNodeData {
  label: string;
  config: AgentCallNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type AgentCallNodeType = Node<AgentCallNodeData, "agent_call">;

const EXECUTION_MODE_LABELS: Record<string, string> = {
  react: "ReAct",
  sequential: "Sequential",
  parallel: "Parallel",
  hierarchical: "Hierarchical",
};

const OUTPUT_FORMAT_LABELS: Record<string, string> = {
  text: "Text",
  json: "JSON",
  structured: "Structured",
};

export const AgentCallNode = memo(
  forwardRef<HTMLDivElement, NodeProps<AgentCallNodeType>>(
    function AgentCallNodeComponent({ data, selected }, ref) {
      const toolCount = data.config.tools?.length ?? 0;
      const agentId = data.config.agentId?.trim() ?? "";
      const agentName = data.config.agentName?.trim() ?? "";
      const prompt = data.config.prompt?.trim() ?? "";
      const executionMode = data.config.executionMode ?? "react";
      const outputFormat = data.config.outputFormat ?? "text";
      const temperature = data.config.temperature ?? 0.7;
      const maxSteps = data.config.maxSteps ?? 10;
      const model = data.config.model?.trim() ?? "";
      const memoryEnabled = data.config.memoryEnabled ?? true;
      const hasSystemPromptOverride = Boolean(
        data.config.systemPromptOverride?.trim()
      );
      const hasStopCondition = Boolean(data.config.stopCondition?.trim());
      const agentLabel = agentName || agentId || "Not set";
      const agentMono = !agentName && Boolean(agentId);
      const executionLabel = EXECUTION_MODE_LABELS[executionMode] ?? "ReAct";
      const outputLabel = OUTPUT_FORMAT_LABELS[outputFormat] ?? "Text";

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!agentId) {
          list.push("Agent ID required");
        }
        if (!prompt) {
          list.push("Prompt is required");
        }
        if (maxSteps <= 0) {
          list.push("Max steps must be at least 1");
        }
        if (temperature < 0 || temperature > 2) {
          list.push("Temperature must be between 0 and 2");
        }
        const tools = data.config.tools ?? [];
        if (tools.length > 0 && new Set(tools).size !== tools.length) {
          list.push("Duplicate tools selected");
        }
        return list;
      }, [agentId, data.config.tools, maxSteps, prompt, temperature]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (agentName) {
          list.push("Display name set");
        }
        if (model) {
          list.push("Model override set");
        }
        if (hasSystemPromptOverride) {
          list.push("System prompt override set");
        }
        if (toolCount > 0) {
          list.push(`${toolCount} tool${toolCount > 1 ? "s" : ""} enabled`);
        }
        if (!memoryEnabled) {
          list.push("Memory disabled");
        }
        if (executionMode !== "react") {
          list.push(`${executionLabel} execution`);
        }
        if (outputFormat === "json") {
          list.push("JSON output");
        }
        if (outputFormat === "structured") {
          list.push(
            hasStopCondition ? "Stop condition set" : "No stop condition set"
          );
        }
        return list;
      }, [
        agentName,
        executionLabel,
        executionMode,
        hasStopCondition,
        hasSystemPromptOverride,
        memoryEnabled,
        model,
        outputFormat,
        toolCount,
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
            colorVar="--node-orchestration"
            icon={<Icons.Bot size={20} />}
            subtitle="Agent"
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1.5">
              <NodeField label="Agent" mono={agentMono} value={agentLabel} />
              {agentName && agentId && (
                <p className="truncate font-mono text-muted-foreground/70 text-xs">
                  {agentId}
                </p>
              )}
              {prompt ? (
                <p className="truncate font-mono text-muted-foreground/70 text-xs">
                  {prompt.slice(0, 32)}
                  {prompt.length > 32 ? "..." : ""}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">No prompt set</p>
              )}
              <NodeField label="Mode" value={executionLabel} />
              <NodeField label="Output" value={outputLabel} />
              {model && <NodeField label="Model" mono value={model} />}
              <NodeField
                label="Tools"
                value={toolCount > 0 ? `${toolCount} enabled` : "None"}
              />
              <div className="flex items-center justify-between">
                <NodeField label="Max Steps" mono value={maxSteps} />
                <NodeField label="Temp" mono value={temperature.toFixed(2)} />
              </div>
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

AgentCallNode.displayName = "AgentCallNode";

export function createAgentCallNodeData(): AgentCallNodeData {
  return {
    label: "Agent Call",
    config: {
      agentId: "",
      prompt: "",
      maxSteps: 10,
      temperature: 0.7,
      executionMode: "react",
      outputFormat: "text",
      memoryEnabled: true,
    },
    inputs: [
      { id: "prompt", label: "Prompt", type: "data", required: false },
      { id: "context", label: "Context", type: "data", required: false },
    ],
    outputs: [
      { id: "response", label: "Response", type: "data", required: true },
      { id: "trace", label: "Trace", type: "data", required: false },
    ],
  };
}
