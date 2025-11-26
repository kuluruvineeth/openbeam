"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

type Conversation = {
  id: string;
  title: string;
  lastMessage?: string;
  assistantId?: string;
  assistantName?: string;
  updatedAt: Date;
  messageCount: number;
};

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const timeAgo = getTimeAgo(new Date(conversation.updatedAt));

  return (
    <Link
      className="group block border-border border-b p-4 transition-colors last:border-b-0 hover:bg-accent/50"
      href={`/chat/${conversation.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
          <Icons.Messages size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="truncate font-medium text-foreground group-hover:text-primary">
              {conversation.title || "Untitled conversation"}
            </h3>
            <span className="ml-2 shrink-0 text-muted-foreground text-xs">
              {timeAgo}
            </span>
          </div>
          {conversation.lastMessage && (
            <p className="mb-2 line-clamp-1 text-muted-foreground text-sm">
              {conversation.lastMessage}
            </p>
          )}
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            {conversation.assistantName && (
              <span className="flex items-center gap-1">
                <Icons.BotIcon size={12} />
                {conversation.assistantName}
              </span>
            )}
            <span>{conversation.messageCount} messages</span>
          </div>
        </div>
        <Button
          className="opacity-0 group-hover:opacity-100"
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowRight size={16} />
        </Button>
      </div>
    </Link>
  );
}

function ConversationSkeleton() {
  return (
    <div className="border-border border-b p-4 last:border-b-0">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86_400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604_800)
    return `${Math.floor(diffInSeconds / 86_400)}d ago`;
  return date.toLocaleDateString();
}

export default function ChatPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.chat.listConversations.queryOptions({
      limit: 50,
      offset: 0,
    })
  );

  const conversations = (data?.conversations || []) as Conversation[];

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Conversations</h1>
          <p className="text-muted-foreground text-sm">
            Your recent AI chat conversations
          </p>
        </div>
        <Button onClick={() => router.push("/chat/new")}>
          <Icons.Plus className="mr-2" size={16} />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="border border-border bg-background">
        {isLoading && (
          <>
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
            <h3 className="mb-2 font-medium text-foreground">
              Failed to load conversations
            </h3>
            <p className="text-muted-foreground text-sm">
              Something went wrong. Please try again.
            </p>
          </div>
        )}

        {!(isLoading || error) && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.Messages className="mb-4 text-muted-foreground" size={32} />
            <h3 className="mb-2 font-medium text-foreground">
              No conversations yet
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Start a new chat to get answers from your knowledge base
            </p>
            <Button onClick={() => router.push("/chat/new")}>
              Start a conversation
            </Button>
          </div>
        )}

        {!(isLoading || error) &&
          conversations.length > 0 &&
          conversations.map((conversation) => (
            <ConversationCard
              conversation={conversation}
              key={conversation.id}
            />
          ))}
      </div>
    </div>
  );
}
