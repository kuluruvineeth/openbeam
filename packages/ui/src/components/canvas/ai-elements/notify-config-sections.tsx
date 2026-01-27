"use client";

import type {
  NotifyChannel,
  NotifyFormat,
  NotifyNodeConfig,
  NotifyPriority,
} from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Checkbox } from "../../checkbox";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Switch } from "../../switch";
import { Textarea } from "../../textarea";
import { ConfigField } from "../panels/config-field";
import { ConfigSection } from "../panels/config-section";
import { SelectionButton } from "./selection-button";

interface SectionProps {
  config: NotifyNodeConfig;
  onChange: (config: Partial<NotifyNodeConfig>) => void;
}

const ALL_CHANNELS: {
  value: NotifyChannel;
  label: string;
  icon: keyof typeof Icons;
}[] = [
  { value: "email", label: "Email", icon: "Mail" },
  { value: "slack", label: "Slack", icon: "Message" },
  { value: "webhook", label: "Webhook", icon: "Webhook" },
  { value: "sms", label: "SMS", icon: "MessageSquare" },
  { value: "in_app", label: "In-App", icon: "Bell" },
];

const ALL_PRIORITIES: {
  value: NotifyPriority;
  label: string;
  color: string;
}[] = [
  {
    value: "low",
    label: "Low",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
  {
    value: "normal",
    label: "Normal",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  {
    value: "high",
    label: "High",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  },
  {
    value: "urgent",
    label: "Urgent",
    color: "bg-red-500/10 text-red-500 border-red-500/30",
  },
];

const ALL_FORMATS: { value: NotifyFormat; label: string }[] = [
  { value: "plain", label: "Plain" },
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
];

export const ChannelSection = memo(function ChannelSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const channels = config.channels ?? ["email"];
  const priority = config.priority ?? "normal";

  const handleToggleChannel = useCallback(
    (channel: NotifyChannel, checked: boolean) => {
      const updated = checked
        ? [...channels, channel]
        : channels.filter((c) => c !== channel);
      if (updated.length === 0) {
        return;
      }
      onChange({ channels: updated });
    },
    [channels, onChange]
  );

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Bell className="size-4" />}
      title="Channels"
    >
      <div className="space-y-4">
        <ConfigField label="Delivery Channels">
          <div className="grid grid-cols-2 gap-2">
            {ALL_CHANNELS.map((channel) => {
              const Icon = Icons[channel.icon];
              const isChecked = channels.includes(channel.value);
              const checkboxId = `channel-${channel.value}`;
              return (
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors",
                    isChecked
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border hover:bg-muted/50"
                  )}
                  htmlFor={checkboxId}
                  key={channel.value}
                >
                  <Checkbox
                    checked={isChecked}
                    id={checkboxId}
                    onCheckedChange={(checked) =>
                      handleToggleChannel(channel.value, checked === true)
                    }
                  />
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">{channel.label}</span>
                </label>
              );
            })}
          </div>
        </ConfigField>

        <ConfigField label="Priority">
          <div className="flex gap-1.5">
            {ALL_PRIORITIES.map((p) => (
              <button
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-center font-medium text-xs transition-colors",
                  priority === p.value
                    ? p.color
                    : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50"
                )}
                key={p.value}
                onClick={() => onChange({ priority: p.value })}
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

ChannelSection.displayName = "ChannelSection";

export const MessageSection = memo(function MessageSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const format = config.format ?? "markdown";

  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Text className="size-4" />}
      title="Message"
    >
      <div className="space-y-4">
        <ConfigField label="Subject">
          <Input
            className="h-9"
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="Notification subject..."
            value={config.subject ?? ""}
          />
        </ConfigField>

        <ConfigField label="Template">
          <Textarea
            className="min-h-[100px] resize-y font-mono text-sm"
            onChange={(e) => onChange({ template: e.target.value })}
            placeholder="Use {{workflow.name}}, {{trigger.user}}, {{output.summary}}..."
            value={config.template ?? ""}
          />
        </ConfigField>

        <ConfigField label="Format">
          <div className="flex gap-1.5">
            {ALL_FORMATS.map((f) => (
              <SelectionButton
                className={cn(
                  "flex-1 px-2 py-1.5 text-center font-medium text-xs",
                  format === f.value
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
                key={f.value}
                onClick={() => onChange({ format: f.value })}
                selected={format === f.value}
              >
                {f.label}
              </SelectionButton>
            ))}
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

MessageSection.displayName = "MessageSection";

export const RecipientsSection = memo(function RecipientsSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const recipients = config.recipients ?? [];

  const handleRecipientsChange = useCallback(
    (value: string) => {
      const parsed = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      onChange({ recipients: parsed.length > 0 ? parsed : undefined });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={recipients.length || undefined}
      defaultOpen={false}
      icon={<Icons.UserCheck className="size-4" />}
      title="Recipients"
    >
      <div className="space-y-4">
        <ConfigField
          label="Static Recipients"
          tooltip="Comma-separated email addresses or user IDs"
        >
          <Textarea
            className="min-h-[60px] resize-y text-sm"
            onChange={(e) => handleRecipientsChange(e.target.value)}
            placeholder="user@example.com, team-lead@example.com"
            value={recipients.join(", ")}
          />
        </ConfigField>

        <ConfigField
          label="Dynamic Expression"
          tooltip="Expression to resolve recipients at runtime"
        >
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) =>
              onChange({
                recipientExpression: e.target.value || undefined,
              })
            }
            placeholder="{{input.assignee_email}}"
            value={config.recipientExpression ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

RecipientsSection.displayName = "RecipientsSection";

export const WebhookSection = memo(function WebhookSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const channels = config.channels ?? ["email"];
  const hasWebhook = channels.includes("webhook");

  return (
    <AnimatedSizeContainer height>
      {hasWebhook && (
        <ConfigSection
          defaultOpen
          icon={<Icons.Webhook className="size-4" />}
          title="Webhook"
        >
          <div className="space-y-4">
            <ConfigField label="Webhook URL" required>
              <Input
                className="h-9 font-mono text-sm"
                onChange={(e) =>
                  onChange({ webhookUrl: e.target.value || undefined })
                }
                placeholder="https://hooks.example.com/notify"
                value={config.webhookUrl ?? ""}
              />
            </ConfigField>

            <ConfigField
              label="Custom Headers"
              tooltip="JSON object of key-value pairs"
            >
              <Textarea
                className="min-h-[60px] resize-y font-mono text-xs"
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onChange({ webhookHeaders: parsed });
                  } catch {
                    onChange({
                      webhookHeaders:
                        e.target.value.trim() === ""
                          ? undefined
                          : config.webhookHeaders,
                    });
                  }
                }}
                placeholder='{"Authorization": "Bearer ..."}'
                value={
                  config.webhookHeaders
                    ? JSON.stringify(config.webhookHeaders, null, 2)
                    : ""
                }
              />
            </ConfigField>
          </div>
        </ConfigSection>
      )}
    </AnimatedSizeContainer>
  );
});

WebhookSection.displayName = "WebhookSection";

export const OptionsSection = memo(function OptionsSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const retryEnabled = config.retryOnFailure ?? false;

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Settings2 className="size-4" />}
      title="Options"
    >
      <div className="space-y-4">
        <ConfigField
          horizontal
          label="Include Context"
          tooltip="Attach workflow context to the notification"
        >
          <Switch
            checked={config.includeContext ?? true}
            onCheckedChange={(includeContext) => onChange({ includeContext })}
          />
        </ConfigField>

        <ConfigField
          horizontal
          label="Retry on Failure"
          tooltip="Automatically retry failed deliveries"
        >
          <Switch
            checked={retryEnabled}
            onCheckedChange={(retryOnFailure) => onChange({ retryOnFailure })}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {retryEnabled && (
            <ConfigField
              label="Max Retries"
              tooltip="Maximum number of retry attempts (0-5)"
            >
              <Input
                className="h-9 font-mono"
                max={5}
                min={0}
                onChange={(e) =>
                  onChange({
                    maxRetries: Number.parseInt(e.target.value, 10) || 3,
                  })
                }
                type="number"
                value={config.maxRetries ?? 3}
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>

        <ConfigField
          label="Group Key"
          tooltip="Group notifications with the same key to prevent duplicates"
        >
          <Input
            className="h-9 font-mono text-sm"
            onChange={(e) =>
              onChange({ groupKey: e.target.value || undefined })
            }
            placeholder="{{workflow.id}}-{{trigger.event}}"
            value={config.groupKey ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

OptionsSection.displayName = "OptionsSection";
