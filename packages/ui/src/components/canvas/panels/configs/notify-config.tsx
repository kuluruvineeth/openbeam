"use client";

import type { NotifyNodeConfig } from "@openplane/types/canvas";
import { memo } from "react";
import {
  ChannelSection,
  MessageSection,
  OptionsSection,
  RecipientsSection,
  WebhookSection,
} from "../../ai-elements/notify-config-sections";

interface NotifyConfigPanelProps {
  config: NotifyNodeConfig;
  onChange: (config: Partial<NotifyNodeConfig>) => void;
}

export const NotifyConfigPanel = memo(function NotifyConfigPanelComponent({
  config,
  onChange,
}: NotifyConfigPanelProps) {
  return (
    <div className="divide-y divide-border/50">
      <ChannelSection config={config} onChange={onChange} />
      <MessageSection config={config} onChange={onChange} />
      <RecipientsSection config={config} onChange={onChange} />
      <WebhookSection config={config} onChange={onChange} />
      <OptionsSection config={config} onChange={onChange} />
    </div>
  );
});

NotifyConfigPanel.displayName = "NotifyConfigPanel";
