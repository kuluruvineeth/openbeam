"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  sources?: Array<{
    id: string;
    title: string;
    url?: string;
  }>;
};

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <Icons.Agents size={16} /> : <Icons.BotIcon size={16} />}
      </div>
      <div
        className={cn(
          "max-w-[80%] space-y-2",
          isUser ? "text-right" : "text-left"
        )}
      >
        <div
          className={cn(
            "inline-block p-4",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background"
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <a
                className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                href={source.url || "#"}
                key={source.id}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icons.FileTextIcon size={12} />
                {source.title}
              </a>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex gap-4">
      <Skeleton className="h-8 w-8 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-20 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationId = params.id as string;
  const [input, setInput] = useState("");

  // Fetch conversation
  const { data, isLoading, error } = useQuery(
    trpc.chat.getConversation.queryOptions({
      conversationId,
    })
  );

  // Send message mutation
  const sendMutation = useMutation(
    trpc.chat.sendMessage.mutationOptions({
      onSuccess: () => {
        setInput("");
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getConversation.queryOptions({ conversationId })
            .queryKey,
        });
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      },
      onError: () => {
        toast.error("Failed to send message");
      },
    })
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMutation.mutate({
        conversationId,
        content: input.trim(),
      });
    }
  };

  const messages = (data?.messages || []) as Message[];
  const conversation = data;

  if (error) {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col items-center justify-center">
        <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
        <h3 className="mb-2 font-medium text-foreground">
          Conversation not found
        </h3>
        <p className="mb-4 text-muted-foreground text-sm">
          This conversation may have been deleted
        </p>
        <Button onClick={() => router.push("/chat")} variant="outline">
          Back to conversations
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-border border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/chat")}
            size="icon"
            variant="ghost"
          >
            <Icons.ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="font-medium text-foreground">
              {isLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                conversation?.title || "Untitled conversation"
              )}
            </h1>
            {conversation?.assistantName && (
              <p className="flex items-center gap-1 text-muted-foreground text-xs">
                <Icons.BotIcon size={12} />
                {conversation.assistantName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost">
            <Icons.Settings size={18} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {isLoading && (
            <>
              <MessageSkeleton />
              <MessageSkeleton />
              <MessageSkeleton />
            </>
          )}

          {!isLoading &&
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

          {sendMutation.isPending && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-muted text-muted-foreground">
                <Icons.BotIcon size={16} />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icons.Spinner className="animate-spin" size={16} />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-border border-t p-4">
        <form className="mx-auto max-w-3xl" onSubmit={handleSend}>
          <div className="flex h-12 items-center border border-border bg-background">
            <Input
              className="flex-1 border-0 bg-transparent text-base focus-visible:ring-0"
              disabled={sendMutation.isPending}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              value={input}
            />
            <Button
              className="mr-2"
              disabled={!input.trim() || sendMutation.isPending}
              size="icon"
              type="submit"
            >
              <Icons.ArrowRight size={18} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
