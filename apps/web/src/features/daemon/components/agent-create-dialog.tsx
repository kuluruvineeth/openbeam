"use client";

import { cn, Icons } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openbeam/ui/components/dialog";
import { useCallback, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { DaemonClient } from "../lib/daemon-client";
import { useSessionStore } from "../stores/session-store";

export interface AgentCreateDialogProps {
  serverId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentCreateDialog({
  serverId,
  open,
  onOpenChange,
}: AgentCreateDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClose = useCallback(() => {
    if (isCreating) {
      return;
    }
    setPrompt("");
    onOpenChange(false);
  }, [isCreating, onOpenChange]);

  const handleSubmit = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || isCreating) {
      return;
    }

    setIsCreating(true);

    const session = useSessionStore.getState().sessions[serverId];
    const client = session?.client as DaemonClient | null;

    if (!client) {
      setIsCreating(false);
      return;
    }

    client.sendSessionMessage({
      type: "create_agent_request",
      requestId: crypto.randomUUID(),
      config: {
        provider: "claude" as const,
        cwd: ".",
      },
      initialPrompt: trimmed,
      labels: {},
    });

    setPrompt("");
    setIsCreating(false);
    onOpenChange(false);
  }, [prompt, isCreating, serverId, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  useHotkeys("escape", handleClose, { enabled: open });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">New Agent</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <textarea
            autoFocus
            className={cn(
              "w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-foreground text-sm outline-none",
              "placeholder:text-muted-foreground/50",
              "focus:border-border focus:ring-1 focus:ring-ring/30"
            )}
            disabled={isCreating}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What should this agent do?"
            ref={textareaRef}
            rows={4}
            value={prompt}
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/50">
              {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to
              submit
            </span>
            <div className="flex items-center gap-2">
              <Button
                className="h-8 px-3 text-xs"
                disabled={isCreating}
                onClick={handleClose}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="h-8 gap-1.5 px-3 text-xs"
                disabled={!prompt.trim() || isCreating}
                onClick={handleSubmit}
                size="sm"
              >
                {isCreating ? (
                  <Icons.Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Icons.Plus className="size-3.5" />
                )}
                Create
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
