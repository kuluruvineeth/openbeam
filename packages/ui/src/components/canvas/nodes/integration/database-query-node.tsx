"use client";

import type {
  DatabaseOperation,
  DatabaseQueryNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

const OPERATION_LABELS: Record<DatabaseOperation, string> = {
  execute_query: "Query",
  select: "SELECT",
  insert: "INSERT",
  update: "UPDATE",
  upsert: "UPSERT",
  delete: "DELETE",
};

const OPERATION_COLORS: Record<DatabaseOperation, string> = {
  execute_query: "text-blue-500",
  select: "text-emerald-500",
  insert: "text-amber-500",
  update: "text-orange-500",
  upsert: "text-violet-500",
  delete: "text-red-500",
};

const ENGINE_LABELS: Record<string, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mssql: "SQL Server",
  sqlite: "SQLite",
  mariadb: "MariaDB",
  oracle: "Oracle",
};

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
      const operation = data.config.operation ?? "execute_query";
      const engine = data.config.engine ?? "postgresql";
      const paramCount = data.config.parameters?.length ?? 0;
      const batchMode = data.config.batchMode ?? "single";

      const queryPreview = useMemo(() => {
        if (operation !== "execute_query") {
          const table = data.config.table;
          return table
            ? `${OPERATION_LABELS[operation]} ${table}`
            : OPERATION_LABELS[operation];
        }
        if (!data.config.query) {
          return "No query";
        }
        const trimmed = data.config.query.trim().slice(0, 50);
        return trimmed + (data.config.query.length > 50 ? "..." : "");
      }, [operation, data.config.query, data.config.table]);

      const subtitle = useMemo(() => {
        const engineLabel = ENGINE_LABELS[engine] ?? engine;
        const connId = data.config.connectionId;
        return connId ? `${engineLabel} · ${connId}` : engineLabel;
      }, [engine, data.config.connectionId]);

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
            subtitle={subtitle}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono font-semibold text-xs ${OPERATION_COLORS[operation]}`}
                >
                  {OPERATION_LABELS[operation]}
                </span>
                {data.config.readOnly && (
                  <Badge className="h-4 px-1 text-[10px]" variant="outline">
                    RO
                  </Badge>
                )}
                {batchMode !== "single" && (
                  <Badge className="h-4 px-1 text-[10px]" variant="outline">
                    {batchMode}
                  </Badge>
                )}
                {paramCount > 0 && (
                  <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                    {paramCount} param{paramCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="truncate font-mono text-muted-foreground/70 text-xs">
                {queryPreview}
              </p>
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
      engine: "postgresql",
      operation: "execute_query",
      query: "",
      parameters: [],
      timeout: 30_000,
      readOnly: true,
      maxRows: 1000,
      batchMode: "single",
      outputFormat: "rows",
      continueOnError: false,
    },
    inputs: [
      { id: "params", label: "Parameters", type: "data", required: false },
    ],
    outputs: [{ id: "rows", label: "Rows", type: "data", required: true }],
  };
}
