"use client";

import type {
  NodeStatus,
  NotifyChannel,
  NotifyNodeConfig,
  NotifyPriority,
  Port,
} from "@openbeam/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
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
const SUPPORTED_CHANNELS = new Set<NotifyChannel>([
  "email",
  "slack",
  "webhook",
]);

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
      const recipientExpression = data.config.recipientExpression ?? "";
      const hasRecipientExpression = recipientExpression.trim().length > 0;
      const subject = data.config.subject ?? "";
      const template = data.config.template ?? "";
      const hasSubject = subject.length > 0;
      const hasTemplate = template.length > 0;
      const retryEnabled = data.config.retryOnFailure ?? false;
      const webhookUrl = data.config.webhookUrl ?? "";
      const hasWebhookUrl = webhookUrl.trim().length > 0;
      const hasRecipients = recipients.length > 0 || hasRecipientExpression;

      const channelSummary = useMemo(() => {
        if (channels.length === 0) {
          return "No channels";
        }
        return channels
          .map((channel) =>
            SUPPORTED_CHANNELS.has(channel)
              ? CHANNEL_LABEL[channel]
              : `${CHANNEL_LABEL[channel]} (unsupported)`
          )
          .join(", ");
      }, [channels]);

      const warnings = useMemo(() => {
        const warningList: string[] = [];
        const unsupported = channels.filter(
          (channel) => !SUPPORTED_CHANNELS.has(channel)
        );

        if (channels.length === 0) {
          warningList.push("Select at least one channel");
        }

        if (unsupported.length > 0) {
          warningList.push(
            `Unsupported: ${unsupported
              .map((channel) => CHANNEL_LABEL[channel])
              .join(", ")}`
          );
        }

        const needsRecipients = channels.some(
          (channel) => channel === "email" || channel === "slack"
        );

        if (needsRecipients && !hasRecipients) {
          warningList.push("Recipients required for Email/Slack");
        }

        if (channels.includes("webhook") && !hasWebhookUrl) {
          warningList.push("Webhook URL required");
        }

        return warningList;
      }, [channels, hasRecipients, hasWebhookUrl]);

      const notes = useMemo(() => {
        const noteList: string[] = [];
        if (!hasTemplate) {
          noteList.push("Empty template sends input payload");
        }
        if (data.config.groupKey?.trim()) {
          noteList.push("Group key enabled");
        }
        if (data.config.includeContext === false) {
          noteList.push("Context excluded from notifications");
        }
        if (data.config.format === "html") {
          noteList.push("HTML format applies to email");
        }
        return noteList;
      }, [
        data.config.format,
        data.config.groupKey,
        data.config.includeContext,
        hasTemplate,
      ]);

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
            subtitle={channelSummary}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              {channels.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  {channels.map((channel) => {
                    const Icon = Icons[CHANNEL_ICON[channel]];
                    const isSupported = SUPPORTED_CHANNELS.has(channel);
                    return (
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded-sm",
                          isSupported
                            ? "bg-muted/60"
                            : "border border-warning/40 bg-warning/5"
                        )}
                        key={channel}
                      >
                        <Icon
                          className={cn(
                            "size-3.5",
                            isSupported
                              ? "text-muted-foreground"
                              : "text-warning"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">
                  No channels selected
                </div>
              )}

              {(recipients.length > 0 || hasRecipientExpression) && (
                <NodeField label="Recipients">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {recipients.length > 0 && (
                      <span className="font-mono">{recipients.length}</span>
                    )}
                    {hasRecipientExpression && (
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px]">
                        Expr
                      </span>
                    )}
                  </div>
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
