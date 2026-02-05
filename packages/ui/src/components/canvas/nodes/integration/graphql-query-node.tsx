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
      const auth = data.config.auth ?? { type: "none" as const };
      const authType = auth.type;
      const headerCount = data.config.headers?.length ?? 0;
      const timeoutMs = data.config.timeoutMs ?? 30_000;
      const hasResponsePath = Boolean(data.config.responsePath?.trim());

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

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!data.config.endpoint?.trim()) {
          list.push("Endpoint required");
        }
        if (!data.config.query?.trim()) {
          list.push("Query required");
        }
        if (method === "GET" && operationType !== "query") {
          list.push("GET only supports query");
        }
        if (data.config.variables?.trim()) {
          try {
            const parsed = JSON.parse(data.config.variables);
            if (
              parsed === null ||
              typeof parsed !== "object" ||
              Array.isArray(parsed)
            ) {
              list.push("Variables must be JSON object");
            }
          } catch {
            list.push("Variables must be valid JSON");
          }
        }
        switch (auth.type) {
          case "basic":
            if (!auth.username?.trim()) {
              list.push("Basic auth username required");
            }
            break;
          case "bearer":
            if (!auth.token?.trim()) {
              list.push("Bearer token required");
            }
            break;
          case "api_key":
            if (!(auth.apiKeyName?.trim() && auth.apiKeyValue?.trim())) {
              list.push("API key required");
            }
            break;
          case "oauth2":
            if (!auth.token?.trim()) {
              if (!auth.oauth2TokenUrl?.trim()) {
                list.push("OAuth token URL required");
              }
              if (!auth.oauth2ClientId?.trim()) {
                list.push("OAuth client ID required");
              }
            }
            break;
          case "custom_header":
            if (!auth.customHeaderName?.trim()) {
              list.push("Custom header required");
            }
            break;
          default:
            break;
        }
        return list;
      }, [
        auth.apiKeyName,
        auth.apiKeyValue,
        auth.customHeaderName,
        auth.oauth2ClientId,
        auth.oauth2TokenUrl,
        auth.token,
        auth.type,
        auth.username,
        data.config.endpoint,
        data.config.query,
        data.config.variables,
        method,
        operationType,
      ]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (method === "GET") {
          list.push("GET sends query via URL");
        }
        if (data.config.operationName?.trim()) {
          list.push("Operation name set");
        }
        if (hasResponsePath) {
          list.push("Response path enabled");
        }
        if (data.config.includeExtensions) {
          list.push("Extensions included");
        }
        if (data.config.followRedirects === false) {
          list.push("Redirects disabled");
        }
        if (data.config.continueOnError) {
          list.push("Continue on error enabled");
        }
        if (operationType === "subscription") {
          list.push("Subscriptions execute as HTTP");
        }
        return list;
      }, [
        data.config.continueOnError,
        data.config.followRedirects,
        data.config.includeExtensions,
        data.config.operationName,
        hasResponsePath,
        method,
        operationType,
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
              {hasResponsePath && (
                <NodeField
                  label="Response Path"
                  mono
                  value={data.config.responsePath}
                />
              )}
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

              {notes.length > 0 && (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      key={note}
                    >
                      <Icons.Info size={12} />
                      <span>{note}</span>
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
