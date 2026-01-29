"use client";

import type {
  ConnectorActionNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface ConnectorActionNodeData {
  label: string;
  config: ConnectorActionNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type ConnectorActionNodeType = Node<
  ConnectorActionNodeData,
  "connector_action"
>;

export const ConnectorActionNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ConnectorActionNodeType>>(
    function ConnectorActionNodeComponent({ data, selected }, ref) {
      const { config } = data;

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
            icon={<Icons.Zap size={20} />}
            subtitle={config.connectorType || "Select connector"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              {config.actionId && (
                <NodeField label="Action" value={config.actionId} />
              )}
              {Object.keys(config.inputMappings).length > 0 && (
                <NodeField
                  label="Inputs"
                  mono
                  value={`${Object.keys(config.inputMappings).length} mapped`}
                />
              )}
              {config.retryConfig && (
                <NodeField
                  label="Retries"
                  value={`${config.retryConfig.maxAttempts}x`}
                />
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ConnectorActionNode.displayName = "ConnectorActionNode";

export function createConnectorActionNodeData(): ConnectorActionNodeData {
  return {
    label: "Connector Action",
    config: {
      connectorType: "",
      actionId: "",
      inputMappings: {},
      continueOnError: false,
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: false }],
    outputs: [{ id: "output", label: "Result", type: "data", required: true }],
  };
}
