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
      const method = data.config.method ?? "GET";
      const auth = data.config.auth ?? { type: "none" as const };
      const retry = data.config.retry ?? {
        enabled: true,
        maxAttempts: 3,
        backoffMs: 1000,
        retryOn: [429, 500, 502, 503, 504],
      };
      const response = data.config.response ?? {
        responseType: "auto" as const,
        followRedirects: true,
        maxRedirects: 10,
        validateCertificate: true,
        parseResponse: true,
      };
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

      const methodColor = METHOD_COLORS[method] ?? "text-muted-foreground";

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!data.config.url?.trim()) {
          list.push("URL required");
        }
        if (response.validateCertificate === false) {
          list.push("SSL validation must be on");
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
        if (retry.enabled && retry.retryOn.length === 0) {
          list.push("Retry codes missing");
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
        data.config.url,
        response.validateCertificate,
        retry.enabled,
        retry.retryOn.length,
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
            icon={<Icons.Globe size={20} />}
            subtitle={urlDisplay}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Method">
                <span className={methodColor}>{method}</span>
              </NodeField>
              {auth.type !== "none" && (
                <NodeField label="Auth" mono value={auth.type} />
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
              {retry.enabled && (
                <NodeField label="Retry" mono value={`${retry.maxAttempts}x`} />
              )}
              {response.followRedirects && (
                <NodeField
                  label="Redirects"
                  mono
                  value={`${response.maxRedirects}`}
                />
              )}
              <NodeField
                label="Timeout"
                mono
                value={`${(data.config.timeoutMs ?? 30_000) / 1000}s`}
              />
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
