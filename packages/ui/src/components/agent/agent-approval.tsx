"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Check, Info, ShieldAlert, X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";

const agentApprovalVariants = cva("rounded-lg border p-4", {
  variants: {
    severity: {
      low: "border-border bg-muted/30",
      medium: "border-yellow-500/30 bg-yellow-500/5",
      high: "border-destructive/30 bg-destructive/5",
    },
  },
  defaultVariants: {
    severity: "low",
  },
});

type ApprovalSeverity = "low" | "medium" | "high";

interface ApprovalAction {
  id: string;
  label: string;
  description?: string;
  isDestructive?: boolean;
}

type AgentApprovalProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentApprovalVariants> & {
    title: string;
    description?: string;
    actions: ApprovalAction[];
    toolName?: string;
    onApprove?: () => void;
    onReject?: () => void;
    onApproveAction?: (actionId: string) => void;
    approveLabel?: string;
    rejectLabel?: string;
    isProcessing?: boolean;
  };

const severityIcons = {
  low: Info,
  medium: AlertTriangle,
  high: ShieldAlert,
};

const AgentApproval = forwardRef<HTMLDivElement, AgentApprovalProps>(
  (
    {
      className,
      severity = "low",
      title,
      description,
      actions,
      toolName,
      onApprove,
      onReject,
      onApproveAction,
      approveLabel = "Approve",
      rejectLabel = "Reject",
      isProcessing = false,
      ...props
    },
    ref
  ) => {
    const SeverityIcon = severityIcons[severity ?? "low"];

    return (
      <div
        className={cn(agentApprovalVariants({ severity }), className)}
        ref={ref}
        {...props}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              severity === "low" && "bg-muted",
              severity === "medium" && "bg-yellow-500/10",
              severity === "high" && "bg-destructive/10"
            )}
          >
            <SeverityIcon
              className={cn(
                "size-4",
                severity === "low" && "text-muted-foreground",
                severity === "medium" && "text-yellow-500",
                severity === "high" && "text-destructive"
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{title}</h4>
              {toolName && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                  {toolName}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-muted-foreground text-sm">
                {description}
              </p>
            )}

            {actions.length > 0 && (
              <div className="mt-3 space-y-2">
                {actions.map((action) => (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-md border bg-background p-2",
                      action.isDestructive && "border-destructive/30"
                    )}
                    key={action.id}
                  >
                    <div>
                      <p
                        className={cn(
                          "font-medium text-sm",
                          action.isDestructive && "text-destructive"
                        )}
                      >
                        {action.label}
                      </p>
                      {action.description && (
                        <p className="text-muted-foreground text-xs">
                          {action.description}
                        </p>
                      )}
                    </div>
                    {onApproveAction && (
                      <Button
                        disabled={isProcessing}
                        onClick={() => onApproveAction(action.id)}
                        size="sm"
                        variant={
                          action.isDestructive ? "destructive" : "outline"
                        }
                      >
                        {approveLabel}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <Button
                className="gap-1.5"
                disabled={isProcessing}
                onClick={onApprove}
                size="sm"
              >
                <Check className="size-3.5" />
                {approveLabel}
              </Button>
              <Button
                className="gap-1.5"
                disabled={isProcessing}
                onClick={onReject}
                size="sm"
                variant="ghost"
              >
                <X className="size-3.5" />
                {rejectLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
AgentApproval.displayName = "AgentApproval";

export { AgentApproval, agentApprovalVariants };
export type { AgentApprovalProps, ApprovalAction, ApprovalSeverity };
