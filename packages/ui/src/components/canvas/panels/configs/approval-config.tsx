"use client";

import type { ApprovalNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../avatar";
import { Checkbox } from "../../../checkbox";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const MOCK_USERS = [
  { id: "1", name: "Alice Chen", email: "alice@example.com", avatar: "" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", avatar: "" },
  { id: "3", name: "Carol Davis", email: "carol@example.com", avatar: "" },
] as const;

interface ApprovalConfigPanelProps {
  config: ApprovalNodeConfig;
  onChange: (config: Partial<ApprovalNodeConfig>) => void;
}

export const ApprovalConfigPanel = memo(
  forwardRef<HTMLDivElement, ApprovalConfigPanelProps>(
    function ApprovalConfigPanelComponent({ config, onChange }, ref) {
      const approvers = config.approvers ?? [];

      const handleToggleApprover = useCallback(
        (userId: string, checked: boolean) => {
          const updated = checked
            ? [...approvers, userId]
            : approvers.filter((id) => id !== userId);
          onChange({ approvers: updated.length > 0 ? updated : undefined });
        },
        [approvers, onChange]
      );

      return (
        <div className="divide-y divide-border/50" ref={ref}>
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
            </div>
          </ConfigSection>

          <ConfigSection
            badge={approvers.length || "Any"}
            defaultOpen
            icon={<Icons.UserCheck className="size-4" />}
            title="Approvers"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                {MOCK_USERS.map((user) => {
                  const isSelected = approvers.includes(user.id);
                  const checkboxId = `approver-${user.id}`;
                  return (
                    <label
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-secondary/50"
                      htmlFor={checkboxId}
                      key={user.id}
                    >
                      <Checkbox
                        checked={isSelected}
                        id={checkboxId}
                        onCheckedChange={(checked) =>
                          handleToggleApprover(user.id, checked === true)
                        }
                      />
                      <Avatar className="size-6">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm">
                          {user.name}
                        </div>
                        <div className="truncate text-muted-foreground text-xs">
                          {user.email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <p className="px-3 text-muted-foreground text-xs">
                Leave all unchecked to allow any team member to approve.
              </p>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings2 className="size-4" />}
            title="Options"
          >
            <div className="space-y-4">
              <ConfigField
                horizontal
                label="Auto Approve"
                tooltip="Automatically approve after timeout"
              >
                <Switch
                  checked={config.autoApprove ?? false}
                  onCheckedChange={(autoApprove) => onChange({ autoApprove })}
                />
              </ConfigField>

              <ConfigField label="Timeout (ms)" tooltip="0 = no timeout">
                <Input
                  className="h-9 font-mono"
                  min={0}
                  onChange={(e) =>
                    onChange({
                      timeoutMs:
                        Number.parseInt(e.target.value, 10) || undefined,
                    })
                  }
                  type="number"
                  value={config.timeoutMs ?? 0}
                />
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

ApprovalConfigPanel.displayName = "ApprovalConfigPanel";
