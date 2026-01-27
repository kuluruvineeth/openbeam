"use client";

import type {
  NodeStatus,
  NotifyChannel,
  NotifyNodeConfig,
  NotifyPriority,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export type { NotifyNodeConfig };

export interface NotifyNodeData {
  label: string;
  config: NotifyNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  [key: string]: unknown;
}

type NotifyNodeType = Node<NotifyNodeData, "notify">;

const CHANNEL_ICON: Record<NotifyChannel, keyof typeof Icons> = {
  email: "Mail",
  slack: "Message",
  webhook: "Webhook",
  sms: "MessageSquare",
  in_app: "Bell",
};

const CHANNEL_LABEL: Record<NotifyChannel, string> = {
  email: "Email",
  slack: "Slack",
  webhook: "Webhook",
  sms: "SMS",
  in_app: "In-App",
};

const PRIORITY_BORDER: Record<NotifyPriority, string> = {
  low: "border-l-emerald-500",
  normal: "border-l-blue-500",
  high: "border-l-orange-500",
  urgent: "border-l-red-500",
};

const PRIORITY_LABEL: Record<NotifyPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const NotifyNode = memo(
  forwardRef<HTMLDivElement, NodeProps<NotifyNodeType>>(
    function NotifyNodeComponent({ data, selected }, ref) {
      const channels: NotifyChannel[] = data.config.channels ?? ["email"];
      const priority: NotifyPriority = data.config.priority ?? "normal";
      const recipients = data.config.recipients ?? [];
      const subject = data.config.subject ?? "";
      const template = data.config.template ?? "";
      const hasSubject = subject.length > 0;
      const hasTemplate = template.length > 0;
      const retryEnabled = data.config.retryOnFailure ?? false;

      return (
        <NodeShell
          className={cn("border-l-2", PRIORITY_BORDER[priority])}
          handles={[
            { type: "target", position: Position.Left },
            { type: "source", position: Position.Right },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            badge={
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                {PRIORITY_LABEL[priority]}
              </span>
            }
            colorVar="--node-notify"
            icon={<Icons.Bell className="size-5" />}
            subtitle={channels.map((c) => CHANNEL_LABEL[c]).join(", ")}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                {channels.map((channel) => {
                  const Icon = Icons[CHANNEL_ICON[channel]];
                  return (
                    <div
                      className="flex size-6 items-center justify-center rounded-sm bg-muted/60"
                      key={channel}
                    >
                      <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>

              {recipients.length > 0 && (
                <NodeField label="Recipients">
                  <span className="font-mono text-muted-foreground">
                    {recipients.length}
                  </span>
                </NodeField>
              )}

              {hasSubject && (
                <NodeField label="Subject">
                  <span className="max-w-[140px] truncate text-muted-foreground">
                    {subject}
                  </span>
                </NodeField>
              )}

              {hasTemplate && (
                <div className="rounded-sm bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                  {template.slice(0, 80)}
                  {template.length > 80 && "..."}
                </div>
              )}

              {retryEnabled && (
                <div className="flex items-center gap-1 pt-0.5 text-muted-foreground text-xs">
                  <Icons.RefreshCw className="size-3" />
                  <span>Retry enabled</span>
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
      channels: ["email"],
      priority: "normal",
      subject: "",
      template: "",
      format: "markdown",
      retryOnFailure: false,
      maxRetries: 3,
      includeContext: true,
    },
    inputs: [{ id: "input", label: "Input", type: "data", required: true }],
    outputs: [{ id: "sent", label: "Sent", type: "data", required: false }],
  };
}
