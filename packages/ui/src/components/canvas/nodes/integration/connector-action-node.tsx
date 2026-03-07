"use client";

import type {
  ConnectorActionNodeConfig,
  NodeStatus,
  Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
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
      const inputMappingsCount = Object.keys(config.inputMappings).length;
      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!config.connectorType?.trim()) {
          list.push("Select a connector");
        }
        if (config.connectorType?.trim() && !config.connectorId?.trim()) {
          list.push("Select an account");
        }
        if (!config.actionId?.trim()) {
          list.push("Select an action");
        }
        return list;
      }, [config.actionId, config.connectorId, config.connectorType]);

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
              {inputMappingsCount > 0 && (
                <NodeField
                  label="Inputs"
                  mono
                  value={`${inputMappingsCount} mapped`}
                />
              )}
              {config.retryConfig && (
                <NodeField
                  label="Retries"
                  value={`${config.retryConfig.maxAttempts}x`}
                />
              )}
              {config.timeoutMs && (
                <NodeField
                  label="Timeout"
                  value={`${Math.round(config.timeoutMs / 1000)}s`}
                />
              )}
              {config.continueOnError && (
                <NodeField label="On Error" value="Continue" />
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
