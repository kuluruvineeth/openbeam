"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Agent = {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  visibility: "private" | "team" | "public";
  creatorId?: string;
  isSharedWithMe?: boolean;
  conversationCount?: number;
};

const TABS = [
  { id: "all", label: "All Agents" },
  { id: "shared", label: "Shared With Me" },
  { id: "mine", label: "Created By Me" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link
      className="group flex flex-col border border-border bg-background p-4 transition-colors hover:border-primary/50"
      href={`/agents/${agent.id}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center bg-primary/10 text-primary">
          {agent.avatarUrl ? (
            <img
              alt={agent.name}
              className="h-full w-full object-cover"
              src={agent.avatarUrl}
            />
          ) : (
            <Icons.BotIcon size={24} />
          )}
        </div>
        <span
          className={cn(
            "px-2 py-0.5 text-xs capitalize",
            agent.visibility === "team" && "bg-blue-500/10 text-blue-500",
            agent.visibility === "public" && "bg-green-500/10 text-green-500",
            agent.visibility === "private" && "bg-muted text-muted-foreground"
          )}
        >
          {agent.visibility}
        </span>
      </div>
      <h3 className="mb-1 truncate font-medium text-foreground group-hover:text-primary">
        {agent.name}
      </h3>
      {agent.description && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
          {agent.description}
        </p>
      )}
      {agent.conversationCount !== undefined && (
        <div className="mt-auto text-muted-foreground text-xs">
          {agent.conversationCount} conversations
        </div>
      )}
    </Link>
  );
}

function AgentSkeleton() {
  return (
    <div className="flex flex-col border border-border bg-background p-4">
      <Skeleton className="mb-3 h-12 w-12" />
      <Skeleton className="mb-2 h-5 w-2/3" />
      <Skeleton className="mb-3 h-8 w-full" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export default function AgentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const activeTab = (searchParams.get("tab") as TabId) || "all";

  const setTab = (tab: TabId) => {
    router.push(`/agents?tab=${tab}`, { scroll: false });
  };

  // Fetch agents based on tab
  const { data, isLoading, error } = useQuery(
    trpc.chat.listAssistants.queryOptions({
      filter:
        activeTab === "shared"
          ? "shared"
          : activeTab === "mine"
            ? "owned"
            : undefined,
      limit: 30,
      offset: 0,
    })
  );

  const agents = (data?.assistants || []) as Agent[];

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">AI Agents</h1>
          <p className="text-muted-foreground text-sm">
            Custom AI assistants trained on your knowledge
          </p>
        </div>
        <Button onClick={() => router.push("/agents/new")}>
          <Icons.Plus className="mr-2" size={16} />
          New Agent
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-border border-b">
        {TABS.map((tab) => (
          <button
            className={cn(
              "-mb-px px-4 py-3 text-sm transition-colors",
              activeTab === tab.id
                ? "border-primary border-b-2 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.id}
            onClick={() => setTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <AgentSkeleton />
          <AgentSkeleton />
          <AgentSkeleton />
          <AgentSkeleton />
          <AgentSkeleton />
          <AgentSkeleton />
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
          <h3 className="mb-2 font-medium text-foreground">
            Failed to load agents
          </h3>
          <p className="text-muted-foreground text-sm">
            Something went wrong. Please try again.
          </p>
        </div>
      )}

      {!(isLoading || error) && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.BotIcon className="mb-4 text-muted-foreground" size={32} />
          <h3 className="mb-2 font-medium text-foreground">
            {activeTab === "mine"
              ? "No agents created"
              : activeTab === "shared"
                ? "No shared agents"
                : "No agents available"}
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            {activeTab === "mine"
              ? "Create your first custom AI agent"
              : "Agents will appear here when available"}
          </p>
          {activeTab === "mine" && (
            <Button onClick={() => router.push("/agents/new")}>
              Create Agent
            </Button>
          )}
        </div>
      )}

      {!(isLoading || error) && agents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard agent={agent} key={agent.id} />
          ))}
        </div>
      )}
    </div>
  );
}
