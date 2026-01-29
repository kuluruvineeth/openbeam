"use client";

import type {
  GraphqlMethod,
  GraphqlOperationType,
  GraphqlQueryNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Badge } from "../../../badge";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

const METHOD_COLORS: Record<GraphqlMethod, string> = {
  POST: "text-blue-500",
  GET: "text-emerald-500",
};

const OPERATION_COLORS: Record<GraphqlOperationType, string> = {
  query: "text-sky-500",
  mutation: "text-amber-500",
  subscription: "text-violet-500",
};

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
      const method = data.config.method ?? "POST";
      const operationType = data.config.operationType ?? "query";
      const authType = data.config.auth?.type ?? "none";
      const headerCount = data.config.headers?.length ?? 0;

      const endpointDisplay = useMemo(() => {
        try {
          return new URL(data.config.endpoint).hostname;
        } catch {
          return data.config.endpoint || "Configure endpoint";
        }
      }, [data.config.endpoint]);

      const queryPreview = useMemo(() => {
        if (!data.config.query) {
          return "No query";
        }
        const trimmed = data.config.query.trim().slice(0, 50);
        return trimmed + (data.config.query.length > 50 ? "..." : "");
      }, [data.config.query]);

      const hasVariables = useMemo(() => {
        const v = data.config.variables;
        if (!v?.trim()) {
          return false;
        }
        try {
          const parsed = JSON.parse(v);
          return Object.keys(parsed).length > 0;
        } catch {
          return v.trim().length > 0;
        }
      }, [data.config.variables]);

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
            icon={<Icons.Braces size={20} />}
            subtitle={endpointDisplay}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono font-semibold text-xs ${METHOD_COLORS[method]}`}
                >
                  {method}
                </span>
                <span
                  className={`font-mono text-xs ${OPERATION_COLORS[operationType]}`}
                >
                  {operationType}
                </span>
                {authType !== "none" && (
                  <Badge className="h-4 px-1 text-[10px]" variant="outline">
                    {authType}
                  </Badge>
                )}
                {headerCount > 0 && (
                  <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                    {headerCount} hdr{headerCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {hasVariables && (
                  <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                    vars
                  </Badge>
                )}
              </div>
              <p className="truncate font-mono text-muted-foreground/70 text-xs">
                {queryPreview}
              </p>
              {data.config.operationName && (
                <NodeField
                  label="Operation"
                  value={data.config.operationName}
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
      method: "POST",
      operationType: "query",
      query: "",
      variables: "",
      headers: [],
      auth: { type: "none" },
      timeoutMs: 30_000,
      includeExtensions: false,
      followRedirects: true,
      continueOnError: false,
    },
    inputs: [
      { id: "variables", label: "Variables", type: "data", required: false },
    ],
    outputs: [{ id: "data", label: "Data", type: "data", required: true }],
  };
}
