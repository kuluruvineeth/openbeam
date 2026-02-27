"use client";

import { cn, Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { useCallback, useState } from "react";
import { MAX_CONTENT_WIDTH } from "../constants";
import { useDaemonConnections } from "../hooks/use-daemon-connection";
import { useSessionStore } from "../stores/session-store";

export function DraftAgentScreen({ serverId }: { serverId: string }) {
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { connections } = useDaemonConnections();
  const connection = connections.find((c) => c.serverId === serverId);
  const isConnected = connection?.status === "online";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!(prompt.trim() && isConnected) || isCreating) {
        return;
      }

      setIsCreating(true);
      const session = useSessionStore.getState().sessions[serverId];
      const client = session?.client as Record<string, unknown> | undefined;
      if (client && typeof client.createAgent === "function") {
        (client.createAgent as (opts: { prompt: string }) => Promise<unknown>)({
          prompt: prompt.trim(),
        })
          .catch((_err) => {
            const _ignored = _err;
          })
          .finally(() => setIsCreating(false));
      } else {
        setIsCreating(false);
      }
    },
    [isConnected, isCreating, prompt, serverId]
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div
        className="flex w-full flex-col items-center gap-6"
        style={{ maxWidth: MAX_CONTENT_WIDTH }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-semibold text-foreground text-xl">New agent</h1>
          <p className="max-w-md text-muted-foreground text-sm">
            Describe what you want the agent to work on.
          </p>
        </div>

        <form
          className="flex w-full max-w-lg items-start gap-2"
          onSubmit={handleSubmit}
        >
          <textarea
            className={cn(
              "flex-1 resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-foreground text-sm outline-none",
              "placeholder:text-muted-foreground/50",
              "focus:border-border focus:ring-1 focus:ring-ring/30"
            )}
            disabled={!isConnected || isCreating}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
            placeholder="What should this agent do?"
            rows={3}
            value={prompt}
          />
          <Button
            className="mt-0.5"
            disabled={!(prompt.trim() && isConnected) || isCreating}
            size="sm"
            type="submit"
          >
            {isCreating ? (
              <Icons.Loader2 className="size-4 animate-spin" />
            ) : (
              <Icons.ArrowRight className="size-4" />
            )}
          </Button>
        </form>

        {!isConnected && (
          <p className="text-destructive/80 text-xs">
            Not connected to daemon. Check your connection settings.
          </p>
        )}
      </div>
    </div>
  );
}
