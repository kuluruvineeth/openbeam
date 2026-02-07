"use client";

import type {
  ConnectorNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
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
      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!data.config.connectorType?.trim()) {
          list.push("Connector type required");
        }
        if (!data.config.connectorId?.trim()) {
          list.push("Account required");
        }
        if (!data.config.operation?.trim()) {
          list.push("Action required");
        }
        return list;
      }, [
        data.config.connectorId,
        data.config.connectorType,
        data.config.operation,
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
            icon={<Icons.Plug size={20} />}
            subtitle={data.config.connectorType}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Operation" value={data.config.operation} />
              {data.config.connectorId && (
                <NodeField label="Account" value={data.config.connectorId} />
              )}
              {data.config.params &&
                Object.keys(data.config.params).length > 0 && (
                  <NodeField
                    label="Params"
                    mono
                    value={`${Object.keys(data.config.params).length} configured`}
                  />
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
