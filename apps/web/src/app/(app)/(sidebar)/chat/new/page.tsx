"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Assistant = {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  visibility: "private" | "team" | "public";
};

function AssistantCard({
  assistant,
  isSelected,
  onSelect,
}: {
  assistant: Assistant;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start gap-4 border p-4 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
      onClick={onSelect}
      type="button"
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center",
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <Icons.BotIcon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 font-medium text-foreground">{assistant.name}</h3>
        {assistant.description && (
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {assistant.description}
          </p>
        )}
      </div>
      {isSelected && (
        <Icons.CheckIcon className="shrink-0 text-primary" size={20} />
      )}
    </button>
  );
}

function AssistantSkeleton() {
  return (
    <div className="flex items-start gap-4 border border-border p-4">
      <Skeleton className="h-10 w-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export default function NewChatPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const [message, setMessage] = useState("");
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(
    null
  );

  // Fetch assistants
  const { data: assistantsData, isLoading: isLoadingAssistants } = useQuery(
    trpc.chat.listAssistants.queryOptions({
      limit: 20,
      offset: 0,
    })
  );

  // Create conversation mutation
  const createMutation = useMutation(
    trpc.chat.createConversation.mutationOptions({
      onSuccess: (data) => {
        router.push(`/chat/${data.id}`);
      },
      onError: () => {
        toast.error("Failed to start conversation");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      createMutation.mutate({
        message: message.trim(),
        assistantId: selectedAssistant || undefined,
      });
    }
  };

  const assistants = (assistantsData?.assistants || []) as Assistant[];

  return (
    <div className="mx-auto max-w-2xl py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-f37-stout text-2xl">Start a new chat</h1>
        <p className="text-muted-foreground">
          Ask questions about your knowledge base
        </p>
      </div>

      {/* Message Input */}
      <form className="mb-8" onSubmit={handleSubmit}>
        <div className="relative mb-4">
          <div className="flex min-h-[120px] flex-col border border-border bg-background p-4 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
            <textarea
              className="flex-1 resize-none bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
              disabled={createMutation.isPending}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like to know?"
              rows={3}
              value={message}
            />
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                {selectedAssistant && (
                  <span className="flex items-center gap-1">
                    <Icons.BotIcon size={12} />
                    Using{" "}
                    {assistants.find((a) => a.id === selectedAssistant)?.name ||
                      "assistant"}
                  </span>
                )}
              </div>
              <Button
                disabled={!message.trim() || createMutation.isPending}
                type="submit"
              >
                {createMutation.isPending ? (
                  <>
                    <Icons.Spinner className="mr-2 animate-spin" size={16} />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Chat
                    <Icons.ArrowRight className="ml-2" size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Or use default */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-border border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-muted-foreground text-sm">
            Or choose an assistant
          </span>
        </div>
      </div>

      {/* Assistants */}
      <div className="space-y-3">
        {isLoadingAssistants && (
          <>
            <AssistantSkeleton />
            <AssistantSkeleton />
            <AssistantSkeleton />
          </>
        )}

        {!isLoadingAssistants && assistants.length === 0 && (
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground text-sm">
              No assistants available. You can start with the default assistant.
            </p>
            <Button
              onClick={() => router.push("/agents/new")}
              variant="outline"
            >
              <Icons.Plus className="mr-2" size={16} />
              Create Assistant
            </Button>
          </div>
        )}

        {!isLoadingAssistants &&
          assistants.length > 0 &&
          assistants.map((assistant) => (
            <AssistantCard
              assistant={assistant}
              isSelected={selectedAssistant === assistant.id}
              key={assistant.id}
              onSelect={() =>
                setSelectedAssistant(
                  selectedAssistant === assistant.id ? null : assistant.id
                )
              }
            />
          ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <Button onClick={() => router.push("/chat")} variant="ghost">
          <Icons.History className="mr-2" size={16} />
          View History
        </Button>
        <Button onClick={() => router.push("/agents")} variant="ghost">
          <Icons.Agents className="mr-2" size={16} />
          Browse Agents
        </Button>
      </div>
    </div>
  );
}
