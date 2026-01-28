"use client";

import type {
  HttpRequestNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface HttpRequestNodeData {
  label: string;
  config: HttpRequestNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type HttpRequestNodeType = Node<HttpRequestNodeData, "http_request">;

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  PATCH: "text-orange-500",
  DELETE: "text-red-500",
};

export const HttpRequestNode = memo(
  forwardRef<HTMLDivElement, NodeProps<HttpRequestNodeType>>(
    function HttpRequestNodeComponent({ data, selected }, ref) {
      const urlDisplay = useMemo(() => {
        try {
          const url = new URL(data.config.url);
          return url.hostname + url.pathname;
        } catch {
          return data.config.url || "Configure URL";
        }
      }, [data.config.url]);

      const activeHeaderCount = useMemo(() => {
        const headers = data.config.headers ?? [];
        return headers.filter((h) => h.enabled && h.key).length;
      }, [data.config.headers]);

      const methodColor =
        METHOD_COLORS[data.config.method] ?? "text-muted-foreground";

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
            icon={<Icons.Globe size={20} />}
            subtitle={urlDisplay}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Method">
                <span className={methodColor}>{data.config.method}</span>
              </NodeField>
              {data.config.auth && data.config.auth.type !== "none" && (
                <NodeField label="Auth" mono value={data.config.auth.type} />
              )}
              {activeHeaderCount > 0 && (
                <NodeField
                  label="Headers"
                  mono
                  value={`${activeHeaderCount} set`}
                />
              )}
              {data.config.bodyType && data.config.bodyType !== "none" && (
                <NodeField label="Body" mono value={data.config.bodyType} />
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

HttpRequestNode.displayName = "HttpRequestNode";

export function createHttpRequestNodeData(): HttpRequestNodeData {
  return {
    label: "HTTP Request",
    config: {
      url: "",
      method: "GET",
      headers: [],
      queryParams: [],
      auth: { type: "none" },
      bodyType: "none",
      retry: {
        enabled: true,
        maxAttempts: 3,
        backoffMs: 1000,
        retryOn: [429, 500, 502, 503, 504],
      },
      response: {
        responseType: "auto",
        followRedirects: true,
        maxRedirects: 10,
        validateCertificate: true,
        parseResponse: true,
      },
      timeoutMs: 30_000,
      continueOnError: false,
    },
    inputs: [{ id: "input", label: "Body", type: "data", required: false }],
    outputs: [
      { id: "output", label: "Response", type: "data", required: true },
    ],
  };
}
