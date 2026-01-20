"use client";

import type { NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Bell } from "lucide-react";
import { forwardRef, memo } from "react";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface NotifyNodeConfig {
  channel: "email" | "slack" | "webhook";
  template: string;
  recipients?: string[];
  webhookUrl?: string;
}

export interface NotifyNodeData {
  label: string;
  config: NotifyNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type NotifyNodeType = Node<NotifyNodeData, "notify">;

const CHANNEL_LABELS: Record<NotifyNodeConfig["channel"], string> = {
  email: "Email",
  slack: "Slack",
  webhook: "Webhook",
};

export const NotifyNode = memo(
  forwardRef<HTMLDivElement, NodeProps<NotifyNodeType>>(
    function NotifyNodeComponent({ data, selected }, ref) {
      const channel = data.config.channel ?? "email";
      const recipients = data.config.recipients ?? [];
      const template = data.config.template ?? "";
      const hasTemplate = template.length > 0;

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
            colorVar="--node-notify"
            icon={<Bell className="size-5" />}
            subtitle={CHANNEL_LABELS[channel]}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              {recipients.length > 0 && (
                <NodeField label="Recipients">
                  <span className="font-mono text-muted-foreground">
                    {recipients.length}
                  </span>
                </NodeField>
              )}
              {hasTemplate && (
                <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                  {template.slice(0, 60)}
                  {template.length > 60 && "..."}
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

NotifyNode.displayName = "NotifyNode";

export function createNotifyNodeData(): NotifyNodeData {
  return {
    label: "Notify",
    config: {
      channel: "email",
      template: "",
      recipients: [],
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [{ id: "sent", label: "Sent", type: "data", required: false }],
  };
}
