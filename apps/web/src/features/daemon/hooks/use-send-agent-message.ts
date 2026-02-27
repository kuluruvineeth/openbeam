"use client";

import { useCallback, useRef } from "react";
import type { DaemonClient } from "../lib/daemon-client";
import { useSessionStore } from "../stores/session-store";
import type { StreamItem } from "../types";

export function useSendAgentMessage(
  serverId: string,
  agentId: string
): (text: string) => void {
  const setAgentStreamTail = useSessionStore((s) => s.setAgentStreamTail);
  const setAgentStreamHead = useSessionStore((s) => s.setAgentStreamHead);
  const messageCounterRef = useRef(0);

  return useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const session = useSessionStore.getState().sessions[serverId];
      const client = session?.client as DaemonClient | null;
      if (!client) {
        return;
      }

      const messageId = crypto.randomUUID();
      const seq = messageCounterRef.current;
      messageCounterRef.current += 1;

      const userItem: StreamItem = {
        kind: "user_message",
        id: `user-msg-${seq}-${messageId}`,
        text: trimmed,
        timestamp: new Date(),
      };

      const head = session.agentStreamHead.get(agentId);
      if (head && head.length > 0) {
        setAgentStreamHead(serverId, (prev) => {
          const next = new Map(prev);
          const existing = prev.get(agentId) ?? [];
          next.set(agentId, [...existing, userItem]);
          return next;
        });
      } else {
        setAgentStreamTail(serverId, (prev) => {
          const next = new Map(prev);
          const existing = prev.get(agentId) ?? [];
          next.set(agentId, [...existing, userItem]);
          return next;
        });
      }

      client.sendSessionMessage({
        type: "send_agent_message_request",
        requestId: messageId,
        agentId,
        text: trimmed,
        messageId,
      });
    },
    [serverId, agentId, setAgentStreamTail, setAgentStreamHead]
  );
}
