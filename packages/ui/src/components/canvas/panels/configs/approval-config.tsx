"use client";

import type { ApprovalNodeConfig } from "@openplane/types/canvas";
import { memo } from "react";
import {
  ActionsSection,
  ApproversSection,
  MessageSection,
  NotificationsSection,
  StrategySection,
  TimeoutSection,
} from "../../ai-elements/approval-config-sections";

interface ApprovalConfigPanelProps {
  config: ApprovalNodeConfig;
  onChange: (config: Partial<ApprovalNodeConfig>) => void;
}

export const ApprovalConfigPanel = memo(function ApprovalConfigPanelComponent({
  config,
  onChange,
}: ApprovalConfigPanelProps) {
  return (
    <div className="divide-y divide-border/50">
      <MessageSection config={config} onChange={onChange} />
      <StrategySection config={config} onChange={onChange} />
      <ApproversSection config={config} onChange={onChange} />
      <ActionsSection config={config} onChange={onChange} />
      <TimeoutSection config={config} onChange={onChange} />
      <NotificationsSection config={config} onChange={onChange} />
    </div>
  );
});

ApprovalConfigPanel.displayName = "ApprovalConfigPanel";
