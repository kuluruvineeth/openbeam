"use client";

import type { Approver } from "@openplane/types/canvas";
import { memo, useCallback, useState } from "react";
import { cn } from "../../../utils";
import { Avatar, AvatarFallback, AvatarImage } from "../../avatar";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Input } from "../../input";

export interface ApproverListEditorProps {
  approvers: Approver[];
  onChange: (approvers: Approver[]) => void;
  disabled?: boolean;
  className?: string;
  maxApprovers?: number;
}

function generateApproverId(): string {
  return `apr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const ApproverListEditor = memo(function ApproverListEditorComponent({
  approvers,
  onChange,
  disabled,
  className,
  maxApprovers = 10,
}: ApproverListEditorProps) {
  const [draft, setDraft] = useState({ name: "", email: "" });

  const handleAdd = useCallback(() => {
    if (!draft.name.trim()) {
      return;
    }
    if (approvers.length >= maxApprovers) {
      return;
    }

    const newApprover: Approver = {
      id: generateApproverId(),
      name: draft.name.trim(),
      email: draft.email.trim() || undefined,
    };

    onChange([...approvers, newApprover]);
    setDraft({ name: "", email: "" });
  }, [draft, approvers, maxApprovers, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(approvers.filter((a) => a.id !== id));
    },
    [approvers, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  const canAddMore = approvers.length < maxApprovers;
  const hasApprovers = approvers.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {hasApprovers ? (
        <div className="space-y-1">
          {approvers.map((approver) => (
            <div
              className="flex items-center gap-2.5 rounded-md border border-border/50 px-2.5 py-2 transition-colors hover:border-border"
              key={approver.id}
            >
              <Avatar className="size-6 shrink-0">
                <AvatarImage src={approver.avatar} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(approver.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-xs">
                  {approver.name}
                </div>
                {approver.email && (
                  <div className="truncate text-[10px] text-muted-foreground">
                    {approver.email}
                  </div>
                )}
                {approver.role && (
                  <div className="truncate text-[10px] text-muted-foreground">
                    {approver.role}
                  </div>
                )}
              </div>
              <button
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                disabled={disabled}
                onClick={() => handleRemove(approver.id)}
                type="button"
              >
                <Icons.Close className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-border/50 border-dashed py-6 text-center">
          <div className="space-y-1">
            <Icons.Users className="mx-auto size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No approvers added</p>
            <p className="text-muted-foreground/70 text-xs">
              Any team member can approve when empty
            </p>
          </div>
        </div>
      )}

      {canAddMore && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <Input
              className="h-8 flex-1 text-xs"
              disabled={disabled}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              onKeyDown={handleKeyDown}
              placeholder="Name"
              value={draft.name}
            />
            <Input
              className="h-8 flex-1 text-xs"
              disabled={disabled}
              onChange={(e) =>
                setDraft((d) => ({ ...d, email: e.target.value }))
              }
              onKeyDown={handleKeyDown}
              placeholder="Email (optional)"
              value={draft.email}
            />
          </div>
          <Button
            className="w-full"
            disabled={disabled || !draft.name.trim()}
            onClick={handleAdd}
            size="sm"
            variant="outline"
          >
            <Icons.UserPlus className="mr-1.5 size-3.5" />
            Add Approver
          </Button>
        </div>
      )}

      {hasApprovers && (
        <p className="text-center text-muted-foreground/70 text-xs">
          {approvers.length} approver{approvers.length !== 1 ? "s" : ""}
          {!canAddMore && (
            <span className="text-amber-500"> · {maxApprovers} max</span>
          )}
        </p>
      )}
    </div>
  );
});

ApproverListEditor.displayName = "ApproverListEditor";
