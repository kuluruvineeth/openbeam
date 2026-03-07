"use client";

import type {
  ApprovalAction,
  ApprovalNodeConfig,
  ApprovalSeverity,
  Approver,
} from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Checkbox } from "../../checkbox";
import { Icons } from "../../icons";
import { Input } from "../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { Switch } from "../../switch";
import { Textarea } from "../../textarea";
import { ConfigField } from "../panels/config-field";
import { ConfigSection } from "../panels/config-section";
import { ApprovalStrategySelector } from "./approval-strategy-selector";
import { ApproverListEditor } from "./approver-list-editor";
import { SeveritySelector } from "./severity-selector";

type ApprovalType = ApprovalNodeConfig["approvalType"];

interface SectionProps {
  config: ApprovalNodeConfig;
  onChange: (config: Partial<ApprovalNodeConfig>) => void;
}

export interface MessageSectionProps extends SectionProps {}

export const MessageSection = memo(function MessageSectionComponent({
  config,
  onChange,
}: MessageSectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Text className="size-4" />}
      title="Message"
    >
      <div className="space-y-4">
        <ConfigField label="Approval Message" required>
          <Textarea
            className="min-h-[100px] resize-y"
            onChange={(e) => onChange({ message: e.target.value })}
            placeholder="Please review and approve this action..."
            value={config.message ?? ""}
          />
        </ConfigField>
        <ConfigField label="Severity">
          <SeveritySelector
            onChange={(severity: ApprovalSeverity) => onChange({ severity })}
            value={config.severity ?? "medium"}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

MessageSection.displayName = "MessageSection";

export interface StrategySectionProps extends SectionProps {}

export const StrategySection = memo(function StrategySectionComponent({
  config,
  onChange,
}: StrategySectionProps) {
  const approvalType = config.approvalType ?? "single";

  const handleTypeChange = useCallback(
    (type: ApprovalType) => {
      const updates: Partial<ApprovalNodeConfig> = { approvalType: type };
      if (type === "single") {
        updates.requiredApprovals = 1;
      }
      onChange(updates);
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={approvalType}
      defaultOpen
      icon={<Icons.GitBranch className="size-4" />}
      title="Strategy"
    >
      <div className="space-y-4">
        <ConfigField label="Approval Type">
          <ApprovalStrategySelector
            onChange={handleTypeChange}
            value={approvalType}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {approvalType !== "single" && (
            <ConfigField
              label="Required Approvals"
              tooltip="Minimum number of approvals needed"
            >
              <Input
                className="h-9 font-mono"
                min={1}
                onChange={(e) =>
                  onChange({
                    requiredApprovals: Number.parseInt(e.target.value, 10) || 1,
                  })
                }
                type="number"
                value={config.requiredApprovals ?? 1}
              />
            </ConfigField>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

StrategySection.displayName = "StrategySection";

export interface ApproversSectionProps extends SectionProps {}

export const ApproversSection = memo(function ApproversSectionComponent({
  config,
  onChange,
}: ApproversSectionProps) {
  const approvers = config.approvers ?? [];

  const handleApproversChange = useCallback(
    (updated: Approver[]) => {
      onChange({ approvers: updated.length > 0 ? updated : undefined });
    },
    [onChange]
  );

  return (
    <ConfigSection
      badge={approvers.length || "Any"}
      defaultOpen
      icon={<Icons.UserCheck className="size-4" />}
      title="Approvers"
    >
      <ApproverListEditor
        approvers={approvers}
        onChange={handleApproversChange}
      />
    </ConfigSection>
  );
});

ApproversSection.displayName = "ApproversSection";

const ALL_ACTIONS: { value: ApprovalAction; label: string }[] = [
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "delegate", label: "Delegate" },
  { value: "request_info", label: "Request Info" },
];
const SUPPORTED_ACTIONS = new Set<ApprovalAction>(["approve", "reject"]);

export interface ActionsSectionProps extends SectionProps {}

export const ActionsSection = memo(function ActionsSectionComponent({
  config,
  onChange,
}: ActionsSectionProps) {
  const allowedActions = config.allowedActions ?? ["approve", "reject"];

  const handleToggleAction = useCallback(
    (action: ApprovalAction, checked: boolean) => {
      if (!SUPPORTED_ACTIONS.has(action) && checked) {
        return;
      }
      const updated = checked
        ? [...allowedActions, action]
        : allowedActions.filter((a) => a !== action);
      if (updated.length === 0) {
        return;
      }
      onChange({ allowedActions: updated });
    },
    [allowedActions, onChange]
  );

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.CheckIcon className="size-4" />}
      title="Actions"
    >
      <div className="space-y-4">
        <ConfigField label="Allowed Actions">
          <div className="space-y-2">
            {ALL_ACTIONS.map((action) => {
              const isChecked = allowedActions.includes(action.value);
              const isSupported = SUPPORTED_ACTIONS.has(action.value);
              const isDisabled = !(isSupported || isChecked);
              const checkboxId = `action-${action.value}`;
              return (
                <label
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50"
                  htmlFor={checkboxId}
                  key={action.value}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isDisabled}
                    id={checkboxId}
                    onCheckedChange={(checked) =>
                      handleToggleAction(action.value, checked === true)
                    }
                  />
                  <span className="text-sm">{action.label}</span>
                  {!isSupported && (
                    <span className="text-muted-foreground text-xs">
                      Not supported
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </ConfigField>

        <ConfigField
          horizontal
          label="Require Comment"
          tooltip="Require approvers to leave a comment"
        >
          <Switch
            checked={config.requireComment ?? false}
            onCheckedChange={(requireComment) => onChange({ requireComment })}
          />
        </ConfigField>

        <ConfigField label="Custom Approve Label">
          <Input
            className="h-8 text-xs"
            onChange={(e) =>
              onChange({
                customLabels: {
                  ...config.customLabels,
                  approve: e.target.value || undefined,
                },
              })
            }
            placeholder="Approve"
            value={config.customLabels?.approve ?? ""}
          />
        </ConfigField>

        <ConfigField label="Custom Reject Label">
          <Input
            className="h-8 text-xs"
            onChange={(e) =>
              onChange({
                customLabels: {
                  ...config.customLabels,
                  reject: e.target.value || undefined,
                },
              })
            }
            placeholder="Reject"
            value={config.customLabels?.reject ?? ""}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

ActionsSection.displayName = "ActionsSection";

export interface TimeoutSectionProps extends SectionProps {}

const TIMEOUT_ACTION_OPTIONS: {
  value: ApprovalNodeConfig["timeoutAction"];
  label: string;
  supported: boolean;
}[] = [
  { value: "reject", label: "Auto Reject", supported: true },
  { value: "approve", label: "Auto Approve", supported: true },
  { value: "escalate", label: "Escalate", supported: false },
];

export const TimeoutSection = memo(function TimeoutSectionComponent({
  config,
  onChange,
}: TimeoutSectionProps) {
  const escalation = config.escalation;
  const hasTimeout = (config.timeoutMs ?? 0) > 0;

  return (
    <ConfigSection
      defaultOpen={false}
      icon={<Icons.Clock className="size-4" />}
      title="Timeout & Escalation"
    >
      <div className="space-y-4">
        <ConfigField label="Timeout (ms)" tooltip="0 = no timeout">
          <Input
            className="h-9 font-mono"
            min={0}
            onChange={(e) =>
              onChange({
                timeoutMs: Number.parseInt(e.target.value, 10) || undefined,
              })
            }
            type="number"
            value={config.timeoutMs ?? 0}
          />
        </ConfigField>

        <AnimatedSizeContainer height>
          {hasTimeout && (
            <div className="space-y-4">
              <ConfigField
                label="Timeout Action"
                tooltip="What happens when timeout expires"
              >
                <Select
                  onValueChange={(v) =>
                    onChange({
                      timeoutAction: v as ApprovalNodeConfig["timeoutAction"],
                    })
                  }
                  value={config.timeoutAction ?? "reject"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEOUT_ACTION_OPTIONS.map((option) => (
                      <SelectItem
                        disabled={!option.supported}
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                        {!option.supported && " (Not supported)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              <ConfigField
                horizontal
                label="Enable Escalation"
                tooltip="Escalate to another approver on timeout"
              >
                <Switch
                  checked={escalation?.enabled ?? false}
                  onCheckedChange={(enabled) =>
                    onChange({
                      escalation: { ...escalation, enabled },
                    })
                  }
                />
              </ConfigField>

              <AnimatedSizeContainer height>
                {escalation?.enabled && (
                  <div className="space-y-4">
                    <ConfigField label="Escalate To (ID)">
                      <Input
                        className="h-8 text-xs"
                        onChange={(e) =>
                          onChange({
                            escalation: {
                              ...escalation,
                              enabled: true,
                              escalateToId: e.target.value || undefined,
                            },
                          })
                        }
                        placeholder="User or group ID"
                        value={escalation.escalateToId ?? ""}
                      />
                    </ConfigField>
                    <ConfigField
                      label="Escalation Delay (ms)"
                      tooltip="Time before escalating"
                    >
                      <Input
                        className="h-9 font-mono"
                        min={0}
                        onChange={(e) =>
                          onChange({
                            escalation: {
                              ...escalation,
                              enabled: true,
                              escalateAfterMs:
                                Number.parseInt(e.target.value, 10) ||
                                undefined,
                            },
                          })
                        }
                        type="number"
                        value={escalation.escalateAfterMs ?? 0}
                      />
                    </ConfigField>
                  </div>
                )}
              </AnimatedSizeContainer>
            </div>
          )}
        </AnimatedSizeContainer>
      </div>
    </ConfigSection>
  );
});

TimeoutSection.displayName = "TimeoutSection";

export interface NotificationsSectionProps extends SectionProps {}

const CHANNEL_OPTIONS: {
  value: "email" | "slack" | "webhook";
  label: string;
}[] = [
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack" },
  { value: "webhook", label: "Webhook" },
];

export const NotificationsSection = memo(
  function NotificationsSectionComponent({
    config,
    onChange,
  }: NotificationsSectionProps) {
    const notification = config.notification ?? {
      channels: ["email"] as ("email" | "slack" | "webhook")[],
      includeContext: true,
      customMessage: undefined,
    };
    const channels = notification.channels ?? ["email"];

    const handleToggleChannel = useCallback(
      (channel: "email" | "slack" | "webhook", checked: boolean) => {
        const updated = checked
          ? [...channels, channel]
          : channels.filter((c) => c !== channel);
        if (updated.length === 0) {
          return;
        }
        onChange({
          notification: { ...notification, channels: updated },
        });
      },
      [channels, notification, onChange]
    );

    return (
      <ConfigSection
        badge={channels.length}
        defaultOpen={false}
        icon={<Icons.Bell className="size-4" />}
        title="Notifications"
      >
        <div className="space-y-4">
          <ConfigField label="Channels">
            <div className="space-y-2">
              {CHANNEL_OPTIONS.map((option) => {
                const isChecked = channels.includes(option.value);
                const checkboxId = `channel-${option.value}`;
                return (
                  <label
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50"
                    htmlFor={checkboxId}
                    key={option.value}
                  >
                    <Checkbox
                      checked={isChecked}
                      id={checkboxId}
                      onCheckedChange={(checked) =>
                        handleToggleChannel(option.value, checked === true)
                      }
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </ConfigField>

          <ConfigField label="Custom Message">
            <Textarea
              className="min-h-[60px] resize-y text-sm"
              onChange={(e) =>
                onChange({
                  notification: {
                    ...notification,
                    customMessage: e.target.value || undefined,
                  },
                })
              }
              placeholder="Optional notification message..."
              value={notification?.customMessage ?? ""}
            />
          </ConfigField>

          <ConfigField
            horizontal
            label="Include Context"
            tooltip="Attach workflow context to notification"
          >
            <Switch
              checked={notification?.includeContext ?? true}
              onCheckedChange={(includeContext) =>
                onChange({
                  notification: { ...notification, includeContext },
                })
              }
            />
          </ConfigField>

          <ConfigField
            horizontal
            label="Auto Approve"
            tooltip="Skip approval and auto-approve"
          >
            <Switch
              checked={config.autoApprove ?? false}
              onCheckedChange={(autoApprove) => onChange({ autoApprove })}
            />
          </ConfigField>
        </div>
      </ConfigSection>
    );
  }
);

NotificationsSection.displayName = "NotificationsSection";
