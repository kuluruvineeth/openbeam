"use client";

import type {
  NodeStatus,
  Port,
  TriggerWebhookNodeConfig,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
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
              <NodeField
                label="Path"
                mono
                value={data.config.path || "/webhook"}
              />
              <NodeField
                label="Auth"
                value={AUTH_LABELS[data.config.authentication] ?? "None"}
              />
              {data.config.rateLimit && (
                <NodeField
                  label="Rate Limit"
                  mono
                  value={`${data.config.rateLimit.requests}/${data.config.rateLimit.windowMs}ms`}
                />
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
