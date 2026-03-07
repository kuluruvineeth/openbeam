"use client";

import { Icons } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDaemonConnectionStatus } from "../hooks/use-daemon-connection";
import { useSendAgentMessage } from "../hooks/use-send-agent-message";
import { type Agent, useSessionStore } from "../stores/session-store";

const MIN_HEIGHT = 36;
const MAX_HEIGHT = 160;

interface AgentChatInputProps {
  serverId: string;
  agentId: string;
}

export function AgentChatInput({ serverId, agentId }: AgentChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const connectionRecord = useDaemonConnectionStatus(serverId);
  const isConnected = connectionRecord?.status === "online";
  const agent = useSessionStore(
    (s) => s.sessions[serverId]?.agents.get(agentId) ?? null
  ) as Agent | null;
  const isRunning = agent?.status === "running";
  const sendMessage = useSendAgentMessage(serverId, agentId);

  const resetHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = `${MIN_HEIGHT}px`;
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resetHeight();
  }, [resetHeight]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!(trimmed && isConnected)) {
      return;
    }
    sendMessage(trimmed);
    setValue("");
  }, [value, isConnected, sendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const canSend = value.trim().length > 0 && isConnected;

  return (
    <div className="shrink-0 border-border/30 border-t bg-background px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          className="flex-1 resize-none bg-transparent font-sans text-foreground text-sm outline-none placeholder:text-muted-foreground/50"
          disabled={!isConnected}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? "Send a message..." : "Disconnected"}
          ref={textareaRef}
          rows={1}
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
          value={value}
        />
        <Button
          className="size-8 shrink-0"
          disabled={!canSend}
          onClick={handleSubmit}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowUp className="size-4" />
        </Button>
      </div>
      {isRunning && value.trim().length > 0 && (
        <span className="mt-1 block text-[10px] text-muted-foreground/50">
          Enter to send — agent is running
        </span>
      )}
    </div>
  );
}
