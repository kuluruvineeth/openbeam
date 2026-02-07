"use client";

import type { NotifyChannel, NotifyNodeConfig } from "@openplane/types/canvas";
import { memo, useMemo } from "react";
import {
  ChannelSection,
  MessageSection,
  OptionsSection,
  RecipientsSection,
  WebhookSection,
} from "../../ai-elements/notify-config-sections";
import { NotesList, WarningsList } from "../feedback-lists";

interface NotifyConfigPanelProps {
  config: NotifyNodeConfig;
  onChange: (config: Partial<NotifyNodeConfig>) => void;
}

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

function buildWarnings(config: NotifyNodeConfig): string[] {
  const warnings: string[] = [];
  const channels = config.channels ?? ["email"];
  const unsupported = channels.filter(
    (channel) => !SUPPORTED_CHANNELS.has(channel)
  );

  if (channels.length === 0) {
    warnings.push("Select at least one channel");
  }

  if (unsupported.length > 0) {
    warnings.push(
      `Unsupported channels: ${unsupported
        .map((channel) => CHANNEL_LABEL[channel])
        .join(", ")}`
    );
  }

  const needsRecipients = channels.some(
    (channel) => channel === "email" || channel === "slack"
  );
  const hasRecipients =
    (config.recipients?.length ?? 0) > 0 ||
    Boolean(config.recipientExpression?.trim());

  if (needsRecipients && !hasRecipients) {
    warnings.push("Recipients are required for Email/Slack");
  }

  if (channels.includes("webhook") && !config.webhookUrl?.trim()) {
    warnings.push("Webhook URL is required");
  }

  return warnings;
}

function buildNotes(config: NotifyNodeConfig): string[] {
  const notes: string[] = [];

  if (!config.template?.trim()) {
    notes.push("Empty template sends the input payload");
  }

  if (config.groupKey?.trim()) {
    notes.push("Group key prevents duplicate notifications");
  }

  if (config.includeContext === false) {
    notes.push("Context is excluded from templates and webhooks");
  }

  if (config.format === "html") {
    notes.push("HTML format is applied to email delivery");
  }

  return notes;
}

export const NotifyConfigPanel = memo(function NotifyConfigPanelComponent({
  config,
  onChange,
}: NotifyConfigPanelProps) {
  const warnings = useMemo(() => buildWarnings(config), [config]);
  const notes = useMemo(() => buildNotes(config), [config]);

  return (
    <div className="divide-y divide-border/50">
      <ChannelSection config={config} onChange={onChange} />
      <MessageSection config={config} onChange={onChange} />
      <RecipientsSection config={config} onChange={onChange} />
      <WebhookSection config={config} onChange={onChange} />
      <OptionsSection config={config} onChange={onChange} />
      <WarningsList items={warnings} />
      <NotesList items={notes} />
    </div>
  );
});

NotifyConfigPanel.displayName = "NotifyConfigPanel";
