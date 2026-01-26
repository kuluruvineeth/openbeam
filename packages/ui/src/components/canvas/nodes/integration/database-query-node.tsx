"use client";

import type {
  DatabaseQueryNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface DatabaseQueryNodeData {
  label: string;
  config: DatabaseQueryNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type DatabaseQueryNodeType = Node<DatabaseQueryNodeData, "database_query">;

export const DatabaseQueryNode = memo(
  forwardRef<HTMLDivElement, NodeProps<DatabaseQueryNodeType>>(
    function DatabaseQueryNodeComponent({ data, selected }, ref) {
      const queryPreview = data.config.query
        ? data.config.query.slice(0, 40) +
          (data.config.query.length > 40 ? "..." : "")
        : "No query";

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
            icon={<Icons.Database size={20} />}
            subtitle={data.config.connectionId || "No connection"}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <p className="truncate font-mono text-muted-foreground/70 text-xs">
                {queryPreview}
              </p>
              <NodeField
                label="Read Only"
                value={data.config.readOnly ? "Yes" : "No"}
              />
              <NodeField
                label="Max Rows"
                mono
                value={data.config.maxRows ?? 1000}
              />
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

DatabaseQueryNode.displayName = "DatabaseQueryNode";

export function createDatabaseQueryNodeData(): DatabaseQueryNodeData {
  return {
    label: "Database Query",
    config: {
      connectionId: "",
      query: "",
      timeout: 30_000,
      readOnly: true,
      maxRows: 1000,
    },
    inputs: [
      { id: "params", label: "Parameters", type: "data", required: false },
    ],
    outputs: [{ id: "rows", label: "Rows", type: "data", required: true }],
  };
}
