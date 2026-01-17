"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Bell } from "lucide-react";
import { forwardRef, memo } from "react";
import { BaseNode, type NodePortDefinition } from "../base-node";

export interface NotifyNodeConfig extends Record<string, unknown> {
  channel: "email" | "slack" | "webhook";
  template: string;
  recipients?: string[];
  webhookUrl?: string;
}

export interface NotifyNodeData {
  label: string;
  config: NotifyNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type NotifyNodeType = Node<NotifyNodeData, "notify">;

const NOTIFY_NODE_COLOR = "rgb(168, 85, 247)";
const TEMPLATE_PREVIEW_LIMIT = 60;

const CHANNEL_LABELS: Record<NotifyNodeConfig["channel"], string> = {
  email: "Email",
  slack: "Slack",
  webhook: "Webhook",
};

export const NotifyNode = memo(
  forwardRef<HTMLDivElement, NodeProps<NotifyNodeType>>(
    function NotifyNodeComponent(props, ref) {
      const { data } = props;
      const channel = data.config.channel ?? "email";
      const recipients = data.config.recipients ?? [];
      const template = data.config.template ?? "";
      const hasTemplate = template.length > 0;
      const templatePreview = template.slice(0, TEMPLATE_PREVIEW_LIMIT);
      const recipientCount = recipients.length;

      return (
        <BaseNode
          {...props}
          category="human"
          color={NOTIFY_NODE_COLOR}
          icon={<Bell className="h-4 w-4" />}
          ref={ref}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Channel</span>
              <span className="font-medium text-xs">
                {CHANNEL_LABELS[channel]}
              </span>
            </div>
            {recipientCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Recipients
                </span>
                <span className="text-xs">{recipientCount}</span>
              </div>
            )}
            {hasTemplate && (
              <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                {templatePreview}
                {template.length > TEMPLATE_PREVIEW_LIMIT && "..."}
              </div>
            )}
          </div>
        </BaseNode>
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
