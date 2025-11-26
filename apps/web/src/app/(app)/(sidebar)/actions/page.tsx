"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Action = {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  isAiEnabled: boolean;
  requiresConfirmation: boolean;
};

type Execution = {
  id: string;
  actionId: string;
  actionName: string;
  status: "success" | "failed" | "running";
  startedAt: Date;
  completedAt?: Date;
  error?: string;
};

const TABS = [
  { id: "catalog", label: "Catalog", icon: Icons.ToolsIcon },
  { id: "runs", label: "Execution History", icon: Icons.History },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CATEGORIES = [
  "All",
  "Documents",
  "Calendar",
  "Email",
  "Slack",
  "Jira",
  "Custom",
];

// Mock data
const MOCK_ACTIONS: Action[] = [
  {
    id: "1",
    name: "Create Google Doc",
    description: "Create a new Google document with specified content",
    category: "Documents",
    tags: ["google", "documents", "create"],
    isAiEnabled: true,
    requiresConfirmation: false,
  },
  {
    id: "2",
    name: "Send Slack Message",
    description: "Send a message to a Slack channel or user",
    category: "Slack",
    tags: ["slack", "message", "communication"],
    isAiEnabled: true,
    requiresConfirmation: true,
  },
  {
    id: "3",
    name: "Create Jira Ticket",
    description: "Create a new Jira issue with specified details",
    category: "Jira",
    tags: ["jira", "issue", "create"],
    isAiEnabled: true,
    requiresConfirmation: true,
  },
  {
    id: "4",
    name: "Schedule Meeting",
    description: "Schedule a calendar meeting with attendees",
    category: "Calendar",
    tags: ["calendar", "meeting", "schedule"],
    isAiEnabled: false,
    requiresConfirmation: true,
  },
];

const MOCK_EXECUTIONS: Execution[] = [
  {
    id: "1",
    actionId: "1",
    actionName: "Create Google Doc",
    status: "success",
    startedAt: new Date(Date.now() - 3_600_000),
    completedAt: new Date(Date.now() - 3_599_000),
  },
  {
    id: "2",
    actionId: "2",
    actionName: "Send Slack Message",
    status: "failed",
    startedAt: new Date(Date.now() - 7_200_000),
    completedAt: new Date(Date.now() - 7_199_000),
    error: "Channel not found",
  },
  {
    id: "3",
    actionId: "3",
    actionName: "Create Jira Ticket",
    status: "success",
    startedAt: new Date(Date.now() - 86_400_000),
    completedAt: new Date(Date.now() - 86_399_000),
  },
];

function ActionCard({ action }: { action: Action }) {
  return (
    <Link
      className="group flex flex-col border border-border bg-background p-4 transition-colors hover:border-primary/50"
      href={`/actions/${action.id}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
          <Icons.ToolsIcon size={20} />
        </div>
        <div className="flex items-center gap-2">
          {action.isAiEnabled && (
            <span className="bg-purple-500/10 px-2 py-0.5 text-purple-500 text-xs">
              AI
            </span>
          )}
          {action.requiresConfirmation && (
            <span className="bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">
              Confirm
            </span>
          )}
        </div>
      </div>
      <h3 className="mb-1 font-medium text-foreground group-hover:text-primary">
        {action.name}
      </h3>
      {action.description && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
          {action.description}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-1">
        {action.tags.slice(0, 3).map((tag) => (
          <span
            className="bg-muted px-2 py-0.5 text-muted-foreground text-xs"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

// Catalog Tab
function CatalogTab() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { isLoading } = useQuery(
    trpc.actions.list.queryOptions({
      category: category !== "All" ? category.toLowerCase() : undefined,
      limit: 30,
      offset: 0,
    })
  );

  const actions = MOCK_ACTIONS.filter((action) => {
    const matchesSearch =
      !search ||
      action.name.toLowerCase().includes(search.toLowerCase()) ||
      action.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || action.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Icons.Search
            className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground"
            size={18}
          />
          <Input
            className="h-10 pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            value={search}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            className={cn(
              "shrink-0 px-4 py-2 text-sm transition-colors",
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            key={cat}
            onClick={() => setCategory(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Actions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              className="flex flex-col border border-border bg-background p-4"
              key={i}
            >
              <Skeleton className="mb-3 h-10 w-10" />
              <Skeleton className="mb-2 h-5 w-2/3" />
              <Skeleton className="mb-3 h-8 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.ToolsIcon className="mb-4 text-muted-foreground" size={32} />
          <h3 className="mb-2 font-medium text-foreground">No actions found</h3>
          <p className="text-muted-foreground text-sm">
            {search
              ? "Try a different search term"
              : "No actions available in this category"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action) => (
            <ActionCard action={action} key={action.id} />
          ))}
        </div>
      )}
    </div>
  );
}

// Runs Tab
function RunsTab() {
  const executions = MOCK_EXECUTIONS;

  const getStatusColor = (status: Execution["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-500";
      case "failed":
        return "bg-red-500/10 text-red-500";
      case "running":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icons.History className="mb-4 text-muted-foreground" size={32} />
        <h3 className="mb-2 font-medium text-foreground">No executions yet</h3>
        <p className="text-muted-foreground text-sm">
          Action executions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-background">
      {executions.map((execution) => (
        <div
          className="flex items-center gap-4 border-border border-b p-4 last:border-b-0"
          key={execution.id}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center",
              getStatusColor(execution.status)
            )}
          >
            {execution.status === "success" && <Icons.CheckIcon size={20} />}
            {execution.status === "failed" && <Icons.AlertCircle size={20} />}
            {execution.status === "running" && (
              <Icons.RefreshCw className="animate-spin" size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {execution.actionName}
            </p>
            <p className="text-muted-foreground text-xs">
              {new Date(execution.startedAt).toLocaleString()}
              {execution.error && (
                <span className="text-red-500"> • {execution.error}</span>
              )}
            </p>
          </div>
          <span
            className={cn(
              "px-2 py-1 text-xs capitalize",
              getStatusColor(execution.status)
            )}
          >
            {execution.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ActionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "catalog";

  const handleTabChange = (tab: TabId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.push(url.pathname + url.search, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Actions</h1>
          <p className="text-muted-foreground text-sm">
            Execute actions across your connected apps
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-border border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={cn(
                "-mb-px flex items-center gap-2 px-4 py-3 text-sm transition-colors",
                activeTab === tab.id
                  ? "border-primary border-b-2 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              type="button"
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "catalog" && <CatalogTab />}
      {activeTab === "runs" && <RunsTab />}
    </div>
  );
}
