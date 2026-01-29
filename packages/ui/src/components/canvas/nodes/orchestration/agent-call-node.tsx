"use client";

import type {
  AgentCallNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
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

export const AgentCallNode = memo(
  forwardRef<HTMLDivElement, NodeProps<AgentCallNodeType>>(
    function AgentCallNodeComponent({ data, selected }, ref) {
      const toolCount = data.config.tools?.length ?? 0;

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
            <div className="space-y-1">
              <NodeField
                label="Agent"
                mono
                value={data.config.agentId || "Not set"}
              />
              {data.config.prompt ? (
                <p className="truncate font-mono text-muted-foreground/70 text-xs">
                  {data.config.prompt.slice(0, 30)}
                  {data.config.prompt.length > 30 ? "..." : ""}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">No prompt set</p>
              )}
              {data.config.model && (
                <NodeField label="Model" mono value={data.config.model} />
              )}
              <NodeField
                label="Tools"
                value={toolCount > 0 ? `${toolCount} enabled` : "None"}
              />
              <NodeField label="Max Steps" mono value={data.config.maxSteps} />
              <NodeField
                label="Temperature"
                mono
                value={data.config.temperature}
              />
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
