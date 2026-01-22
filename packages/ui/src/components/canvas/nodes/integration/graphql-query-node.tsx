"use client";

import type {
  GraphqlQueryNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Braces } from "lucide-react";
import { forwardRef, memo, useMemo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface GraphqlQueryNodeData {
  label: string;
  config: GraphqlQueryNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type GraphqlQueryNodeType = Node<GraphqlQueryNodeData, "graphql_query">;

export const GraphqlQueryNode = memo(
  forwardRef<HTMLDivElement, NodeProps<GraphqlQueryNodeType>>(
    function GraphqlQueryNodeComponent({ data, selected }, ref) {
      const endpointDisplay = useMemo(() => {
        try {
          const url = new URL(data.config.endpoint);
          return url.hostname;
        } catch {
          return data.config.endpoint || "Configure endpoint";
        }
      }, [data.config.endpoint]);

      const operationName = data.config.operationName || "Anonymous";
      const variableCount = data.config.variables
        ? Object.keys(data.config.variables).length
        : 0;

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
            icon={<Braces className="size-5" />}
            subtitle={endpointDisplay}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Operation" value={operationName} />
              {variableCount > 0 && (
                <NodeField
                  label="Variables"
                  mono
                  value={`${variableCount} defined`}
                />
              )}
              <NodeField
                label="Timeout"
                mono
                value={`${(data.config.timeoutMs ?? 30_000) / 1000}s`}
              />
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

GraphqlQueryNode.displayName = "GraphqlQueryNode";

export function createGraphqlQueryNodeData(): GraphqlQueryNodeData {
  return {
    label: "GraphQL Query",
    config: {
      endpoint: "",
      query: "",
      timeoutMs: 30_000,
    },
    inputs: [
      { id: "variables", label: "Variables", type: "data", required: false },
    ],
    outputs: [{ id: "data", label: "Data", type: "data", required: true }],
  };
}
