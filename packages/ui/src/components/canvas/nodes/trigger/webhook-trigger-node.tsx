"use client";

import type {
  NodeStatus,
  Port,
  TriggerWebhookNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface WebhookTriggerNodeData {
  label: string;
  config: TriggerWebhookNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type WebhookTriggerNodeType = Node<WebhookTriggerNodeData, "trigger_webhook">;

const AUTH_LABELS: Record<string, string> = {
  none: "None",
  bearer: "Bearer",
  basic: "Basic",
  hmac: "HMAC",
  api_key: "API Key",
};

export const WebhookTriggerNode = memo(
  forwardRef<HTMLDivElement, NodeProps<WebhookTriggerNodeType>>(
    function WebhookTriggerNodeComponent({ data, selected }, ref) {
      const path = data.config.path?.trim() ?? "";
      const auth = data.config.authentication ?? "none";
      const signatureHeader = data.config.signatureHeader?.trim() ?? "";
      const secret = data.config.secret?.trim() ?? "";
      const rateLimit = data.config.rateLimit;
      const allowedIps = data.config.allowedIps ?? [];

      const warnings = useMemo(() => {
        const list: string[] = [];
        if (!path) {
          list.push("Path is required");
        }
        if (path && !path.startsWith("/")) {
          list.push("Path should start with /");
        }
        if (auth !== "none" && !secret) {
          list.push("Secret is required");
        }
        if (auth === "hmac" && !signatureHeader) {
          list.push("Signature header is required");
        }
        if (rateLimit && (rateLimit.requests <= 0 || rateLimit.windowMs <= 0)) {
          list.push("Rate limit must be positive");
        }
        return list;
      }, [auth, path, rateLimit, secret, signatureHeader]);

      const notes = useMemo(() => {
        const list: string[] = [];
        if (auth === "none") {
          list.push("Unauthenticated webhook");
        }
        if (auth === "api_key") {
          list.push("API key expected in header");
        }
        if (rateLimit) {
          list.push(
            `Rate limit ${rateLimit.requests}/${Math.round(
              rateLimit.windowMs / 1000
            )}s`
          );
        }
        if (allowedIps.length > 0) {
          list.push(`${allowedIps.length} IPs allowlisted`);
        }
        if (data.config.validationSchema) {
          list.push("Validation schema enabled");
        }
        return list;
      }, [allowedIps.length, auth, data.config.validationSchema, rateLimit]);

      return (
        <NodeShell
          handles={[{ type: "source", position: Position.Right }]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-trigger"
            icon={<Icons.Webhook size={20} />}
            subtitle={data.config.method}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-1">
              <NodeField label="Path" mono value={path || "/webhook"} />
              <NodeField label="Auth" value={AUTH_LABELS[auth] ?? "None"} />
              {data.config.rateLimit && (
                <NodeField
                  label="Rate Limit"
                  mono
                  value={`${data.config.rateLimit.requests}/${data.config.rateLimit.windowMs}ms`}
                />
              )}
              {allowedIps.length > 0 && (
                <NodeField
                  label="Allowlist"
                  mono
                  value={`${allowedIps.length} IPs`}
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

WebhookTriggerNode.displayName = "WebhookTriggerNode";

export function createWebhookTriggerNodeData(): WebhookTriggerNodeData {
  return {
    label: "Webhook Trigger",
    config: {
      path: "/webhook",
      method: "POST",
      authentication: "none",
    },
    outputs: [
      { id: "payload", label: "Payload", type: "data", required: true },
      { id: "headers", label: "Headers", type: "data", required: false },
    ],
  };
}
