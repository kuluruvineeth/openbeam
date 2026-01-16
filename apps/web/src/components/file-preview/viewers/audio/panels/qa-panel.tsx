"use client";

import { Button, Input } from "@openplane/ui";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { QAMessage } from "@/lib/audio-types";
import { extractTimestamps } from "@/lib/audio-utils";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type QAPanelProps = {
  onAsk: (question: string) => Promise<string>;
  onSeek: (time: number) => void;
  isAsking: boolean;
};

export function AudioQAPanel({ onAsk, onSeek, isAsking }: QAPanelProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [input, setInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isAsking) {
      return;
    }

    const userMessage: QAMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const answer = await onAsk(question);
      const assistantMessage: QAMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        timestamps: extractTimestamps(answer),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to get audio Q&A response:", error);
      const errorMessage: QAMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I couldn't answer that question.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onSeek={onSeek} />
            ))}
            {isAsking && <TypingIndicator />}
          </div>
        )}
      </ScrollArea>

      <form
        className="shrink-0 border-border/40 border-t p-2.5"
        onSubmit={handleSubmit}
      >
        <div className="relative">
          <Input
            className="h-8 pr-9 text-[13px]"
            disabled={isAsking}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this audio..."
            value={input}
          />
          <Button
            className="-translate-y-1/2 absolute top-1/2 right-1 size-6"
            disabled={!input.trim() || isAsking}
            size="icon"
            type="submit"
            variant="ghost"
          >
            {isAsking ? (
              <Icons.Spinner className="size-3.5 animate-spin" />
            ) : (
              <Icons.ArrowRight className="size-3.5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  onSeek,
}: {
  message: QAMessage;
  onSeek: (time: number) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] px-2.5 py-2 text-[13px]",
          isUser ? "bg-primary text-primary-foreground" : "bg-foreground/4"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.timestamps && message.timestamps.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.timestamps.map((ts, i) => (
              <button
                className="bg-background/40 px-1.5 py-0.5 font-mono text-[10px] tabular-nums hover:bg-background/60"
                key={i}
                onClick={() => onSeek(ts)}
                type="button"
              >
                {formatTime(ts)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
        <div className="-translate-x-1/2 absolute top-1/4 left-1/4">
          <Icons.Message size={80} />
        </div>
      </div>
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-3 flex size-9 items-center justify-center border border-border/40">
          <Icons.Message className="text-foreground/25" size={18} />
        </div>
        <p className="font-medium text-[13px] text-foreground/60">
          Ask anything about this audio
        </p>
        <p className="mt-1 text-[11px] text-foreground/35">
          Get AI-powered answers with timestamps
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 bg-foreground/4 px-2.5 py-2">
        <span className="size-1.5 animate-bounce bg-foreground/30 [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce bg-foreground/30 [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce bg-foreground/30" />
      </div>
    </div>
  );
}
