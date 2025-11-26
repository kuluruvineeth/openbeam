"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type SavedSearch = {
  id: string;
  name: string;
  query: string;
  description?: string;
  isPinned: boolean;
  runCount: number;
  visibility: "PRIVATE" | "TEAM" | "PUBLIC";
  createdAt: Date;
  lastRunAt?: Date;
};

function SavedSearchCard({
  search,
  onRun,
  onDelete,
  onTogglePin,
}: {
  search: SavedSearch;
  onRun: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className="group border border-border bg-background p-4 transition-colors hover:border-primary/30">
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-medium text-foreground">
              {search.name}
            </h3>
            {search.isPinned && (
              <span className="text-primary">
                <Icons.CheckIcon size={14} />
              </span>
            )}
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                search.visibility === "TEAM" && "bg-blue-500/10 text-blue-500",
                search.visibility === "PUBLIC" &&
                  "bg-green-500/10 text-green-500",
                search.visibility === "PRIVATE" &&
                  "bg-muted text-muted-foreground"
              )}
            >
              {search.visibility}
            </span>
          </div>
          <p className="truncate font-mono text-muted-foreground text-xs">
            {search.query}
          </p>
        </div>
      </div>

      {search.description && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
          {search.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <span>Run {search.runCount} times</span>
          {search.lastRunAt && (
            <span>
              Last run {new Date(search.lastRunAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button onClick={onTogglePin} size="icon" variant="ghost">
            <Icons.CheckIcon size={16} />
          </Button>
          <Button onClick={onDelete} size="icon" variant="ghost">
            <Icons.XIcon size={16} />
          </Button>
          <Button onClick={onRun} size="sm">
            Run
          </Button>
        </div>
      </div>
    </div>
  );
}

function SavedSearchSkeleton() {
  return (
    <div className="border border-border bg-background p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="mb-3 h-4 w-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function SavedSearchesEmptyState({
  filter,
  onSearch,
}: {
  filter: "all" | "pinned";
  onSearch: () => void;
}) {
  const isPinned = filter === "pinned";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icons.Search className="mb-4 text-muted-foreground" size={32} />
      <h3 className="mb-2 font-medium text-foreground">
        {isPinned ? "No pinned searches" : "No saved searches"}
      </h3>
      <p className="mb-4 text-muted-foreground text-sm">
        {isPinned
          ? "Pin your frequently used searches for quick access"
          : "Save your searches to quickly run them later"}
      </p>
      <Button onClick={onSearch}>Start searching</Button>
    </div>
  );
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"all" | "pinned">("all");

  // Fetch saved searches
  const { data, isLoading, error } = useQuery(
    trpc.search.listSaved.queryOptions({
      limit: 50,
      offset: 0,
    })
  );

  // Run saved search mutation
  const runMutation = useMutation(
    trpc.search.runSaved.mutationOptions({
      onSuccess: (_, variables) => {
        const search = data?.searches?.find((s) => s.id === variables.searchId);
        if (search) {
          router.push(`/search/${encodeURIComponent(search.query)}`);
        }
      },
      onError: () => {
        toast.error("Failed to run search");
      },
    })
  );

  // Delete saved search mutation
  const deleteMutation = useMutation(
    trpc.search.deleteSaved.mutationOptions({
      onSuccess: () => {
        toast.success("Search deleted");
        queryClient.invalidateQueries({
          queryKey: trpc.search.listSaved.queryOptions({}).queryKey,
        });
      },
      onError: () => {
        toast.error("Failed to delete search");
      },
    })
  );

  // Toggle pin mutation
  const togglePinMutation = useMutation(
    trpc.search.togglePin.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.search.listSaved.queryOptions({}).queryKey,
        });
      },
      onError: () => {
        toast.error("Failed to update search");
      },
    })
  );

  const searches = (data?.searches || []) as SavedSearch[];
  const filteredSearches =
    filter === "pinned" ? searches.filter((s) => s.isPinned) : searches;

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Saved Searches</h1>
          <p className="text-muted-foreground text-sm">
            Quick access to your frequently used searches
          </p>
        </div>
        <Button onClick={() => router.push("/search")} variant="outline">
          <Icons.Plus className="mr-2" size={16} />
          New Search
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex items-center gap-1 border-border border-b">
        <button
          className={cn(
            "-mb-px px-4 py-2 text-sm transition-colors",
            filter === "all"
              ? "border-primary border-b-2 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setFilter("all")}
          type="button"
        >
          All Searches
        </button>
        <button
          className={cn(
            "-mb-px px-4 py-2 text-sm transition-colors",
            filter === "pinned"
              ? "border-primary border-b-2 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setFilter("pinned")}
          type="button"
        >
          Pinned
        </button>
      </div>

      {/* Saved Searches List */}
      <div className="space-y-3">
        {isLoading && (
          <>
            <SavedSearchSkeleton />
            <SavedSearchSkeleton />
            <SavedSearchSkeleton />
          </>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
            <h3 className="mb-2 font-medium text-foreground">
              Failed to load saved searches
            </h3>
            <p className="text-muted-foreground text-sm">
              Something went wrong. Please try again.
            </p>
          </div>
        )}

        {!(isLoading || error) && filteredSearches.length === 0 && (
          <SavedSearchesEmptyState
            filter={filter}
            onSearch={() => router.push("/search")}
          />
        )}

        {!(isLoading || error) &&
          filteredSearches.length > 0 &&
          filteredSearches.map((search) => (
            <SavedSearchCard
              key={search.id}
              onDelete={() => deleteMutation.mutate({ searchId: search.id })}
              onRun={() => runMutation.mutate({ searchId: search.id })}
              onTogglePin={() =>
                togglePinMutation.mutate({ searchId: search.id })
              }
              search={search}
            />
          ))}
      </div>
    </div>
  );
}
