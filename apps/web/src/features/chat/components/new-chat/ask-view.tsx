"use client";

import { useState } from "react";
import { ChatBox } from "@/features/chat/components/chat-box/chat-box";

export function AskView() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex w-full items-center justify-center">
      {/* biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not an ARIA attribute */}
      <ChatBox
        isStreaming={false}
        query={query}
        retryIsStreaming={false}
        role="user"
        setQuery={setQuery}
      />
    </div>
  );
}
