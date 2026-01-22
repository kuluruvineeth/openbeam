"use client";

import type {
  ConnectorNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Plug } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ConnectorNodeData {
  label: string;
  config: ConnectorNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ConnectorNodeType = Node<ConnectorNodeData, "connector">;

export const ConnectorNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ConnectorNodeType>>(
    function ConnectorNodeComponent({ data, selected }, ref) {
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
            icon={<Plug className="size-5" />}
            subtitle={data.config.connectorType}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Operation" value={data.config.operation} />
              {data.config.params &&
                Object.keys(data.config.params).length > 0 && (
                  <NodeField
                    label="Params"
                    mono
                    value={`${Object.keys(data.config.params).length} configured`}
                  />
                )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ConnectorNode.displayName = "ConnectorNode";

export function createConnectorNodeData(): ConnectorNodeData {
  return {
    label: "Connector",
    config: {
      connectorType: "",
      operation: "",
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: false }],
    outputs: [{ id: "output", label: "Result", type: "data", required: true }],
  };
}
