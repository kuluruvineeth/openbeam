"use client";

import { useState } from "react";
import { ChatBox } from "@/features/chat/components/chat-box/chat-box";

export function AskView() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex w-full items-center justify-center">
      <ChatBox
        isStreaming={false}
        query={query}
        retryIsStreaming={false}
        setQuery={setQuery}
        userRole="user"
      />
    </div>
  );
}
