"use client";

import type {
  DatabaseOperation,
  DatabaseQueryNodeConfig,
  NodeStatus,
  Port,
  QueryOutputFormat,
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

const OUTPUT_LABELS: Record<QueryOutputFormat, string> = {
  rows: "Rows",
  first_row: "First Row",
  count: "Count",
  raw: "Raw",
};

const SUPPORTED_ENGINES = new Set(["postgresql", "mysql", "mariadb"]);

const READ_ONLY_PREFIXES = new Set([
  "select",
  "with",
  "show",
  "describe",
  "explain",
  "pragma",
]);
const LEADING_KEYWORD_REGEX = /^([a-zA-Z]+)/;

function stripLeadingComments(sql: string): string {
  let text = sql.trimStart();
  while (text.startsWith("--") || text.startsWith("/*")) {
    if (text.startsWith("--")) {
      const newline = text.indexOf("\n");
      if (newline === -1) {
        return "";
      }
      text = text.slice(newline + 1).trimStart();
      continue;
    }
    const end = text.indexOf("*/");
    if (end === -1) {
      return "";
    }
    text = text.slice(end + 2).trimStart();
  }
  return text;
}

function isReadOnlyQuery(sql: string): boolean {
  const stripped = stripLeadingComments(sql);
  if (!stripped) {
    return false;
  }
  const match = stripped.match(LEADING_KEYWORD_REGEX);
  if (!match) {
    return false;
  }
  return READ_ONLY_PREFIXES.has(match[1]?.toLowerCase() ?? "");
}

function hasMultipleStatements(sql: string): boolean {
  const trimmed = sql.trim();
  if (!trimmed) {
    return false;
  }
  const withoutTrailing = trimmed.endsWith(";")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  if (!withoutTrailing) {
    return false;
  }
  return withoutTrailing.includes(";");
}

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
      const outputFormat = data.config.outputFormat ?? "rows";
      const timeoutMs = data.config.timeout ?? 30_000;
      const readOnly = data.config.readOnly ?? true;
      const connectionId = data.config.connectionId?.trim() ?? "";

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

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!connectionId) {
          list.push("Connection required");
        }
        if (!SUPPORTED_ENGINES.has(engine)) {
          list.push("Engine not supported");
        }
        if (operation === "execute_query") {
          const query = data.config.query ?? "";
          if (query.trim()) {
            if (hasMultipleStatements(query)) {
              list.push("Multiple statements not supported");
            }
            if (readOnly && !isReadOnlyQuery(query)) {
              list.push("Read-only blocks write queries");
            }
          } else {
            list.push("Query required");
          }
        } else {
          if (!data.config.table?.trim()) {
            list.push("Table required");
          }
          if (operation === "upsert" && !data.config.conflictColumn?.trim()) {
            list.push("Conflict column required");
          }
          if (readOnly && operation !== "select") {
            list.push("Read-only blocks writes");
          }
          if (
            (operation === "update" || operation === "delete") &&
            !data.config.whereClause?.trim()
          ) {
            list.push("Missing WHERE clause");
          }
        }
        return list;
      }, [
        connectionId,
        data.config.conflictColumn,
        data.config.query,
        data.config.table,
        data.config.whereClause,
        engine,
        operation,
        readOnly,
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
              <NodeField
                label="Output"
                mono
                value={OUTPUT_LABELS[outputFormat]}
              />
              <NodeField label="Timeout" mono value={`${timeoutMs / 1000}s`} />
              {data.config.continueOnError && (
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
