"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const TABS = [
  { id: "collections", label: "Collections", icon: Icons.KnowledgeManagement },
  { id: "bookmarks", label: "Bookmarks", icon: Icons.CheckIcon },
  { id: "recent", label: "Recent", icon: Icons.History },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Collections Tab Content
function CollectionsTab() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.collections.list.queryOptions({ limit: 50, offset: 0 })
  );

  const collections = data?.collections ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div className="border border-border bg-background p-4" key={i}>
            <Skeleton className="mb-3 h-10 w-10" />
            <Skeleton className="mb-2 h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-border border-dashed py-16 text-center">
        <Icons.KnowledgeManagement
          className="mb-4 text-muted-foreground"
          size={32}
        />
        <h3 className="mb-2 font-medium text-foreground">No collections</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          Create your first collection to organize your knowledge
        </p>
        <Button asChild>
          <Link href="/library/collections/new">Create Collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {collections.map((collection) => (
        <Link
          className="group flex flex-col border border-border bg-background p-4 transition-colors hover:border-primary/50"
          href={`/library/collections/${collection.id}`}
          key={collection.id}
        >
          <div className="mb-3 flex items-start justify-between">
            <div
              className="flex h-10 w-10 items-center justify-center"
              style={{ backgroundColor: collection.color || "#f3f4f6" }}
            >
              <Icons.KnowledgeManagement
                className={
                  collection.color ? "text-white" : "text-muted-foreground"
                }
                size={20}
              />
            </div>
            {collection.isPinned && (
              <Icons.CheckIcon className="text-primary" size={16} />
            )}
          </div>
          <h3 className="mb-1 truncate font-medium text-foreground group-hover:text-primary">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="mb-2 line-clamp-2 text-muted-foreground text-sm">
              {collection.description}
            </p>
          )}
          <div className="mt-auto flex items-center gap-2 text-muted-foreground text-xs">
            <span>{collection.itemCount} items</span>
            <span className="capitalize">• {collection.visibility}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Bookmarks Tab Content
function BookmarksTab() {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.collections.listBookmarks.queryOptions({ limit: 50, offset: 0 })
  );

  const bookmarks = data?.bookmarks ?? [];

  if (isLoading) {
    return (
      <div className="border border-border bg-background">
        {[1, 2, 3].map((i) => (
          <div className="border-border border-b p-4 last:border-b-0" key={i}>
            <Skeleton className="mb-2 h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icons.CheckIcon className="mb-4 text-muted-foreground" size={32} />
        <h3 className="mb-2 font-medium text-foreground">No bookmarks</h3>
        <p className="text-muted-foreground text-sm">
          Bookmark documents to save them for later
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-background">
      {bookmarks.map((bookmark) => (
        <a
          className="group flex items-center gap-4 border-border border-b p-4 transition-colors last:border-b-0 hover:bg-accent/50"
          href={bookmark.url || "#"}
          key={bookmark.id}
        >
          <Icons.FileTextIcon className="text-muted-foreground" size={18} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground group-hover:text-primary">
              {bookmark.title || "Untitled"}
            </p>
            <p className="text-muted-foreground text-xs">
              {new Date(bookmark.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            className="opacity-0 group-hover:opacity-100"
            size="icon"
            variant="ghost"
          >
            <Icons.ArrowRight size={16} />
          </Button>
        </a>
      ))}
    </div>
  );
}

// Recent Tab Content
function RecentTab() {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.preferences.getRecentItems.queryOptions({ limit: 20 })
  );

  const recentItems = data ?? [];

  const getIcon = (type: string) => {
    switch (type) {
      case "document":
        return <Icons.FileTextIcon size={18} />;
      case "search":
        return <Icons.Search size={18} />;
      case "collection":
        return <Icons.KnowledgeManagement size={18} />;
      case "assistant":
        return <Icons.BotIcon size={18} />;
      default:
        return <Icons.FileIcon size={18} />;
    }
  };

  if (isLoading) {
    return (
      <div className="border border-border bg-background">
        {[1, 2, 3].map((i) => (
          <div className="border-border border-b p-4 last:border-b-0" key={i}>
            <Skeleton className="mb-2 h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (recentItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icons.History className="mb-4 text-muted-foreground" size={32} />
        <h3 className="mb-2 font-medium text-foreground">No recent activity</h3>
        <p className="text-muted-foreground text-sm">
          Items you access will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-background">
      {recentItems.map((item) => (
        <a
          className="group flex items-center gap-4 border-border border-b p-4 transition-colors last:border-b-0 hover:bg-accent/50"
          href={item.url || "#"}
          key={`${item.itemType}-${item.itemId}`}
        >
          <div className="flex h-10 w-10 items-center justify-center bg-muted text-muted-foreground">
            {getIcon(item.itemType)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground group-hover:text-primary">
              {item.title || "Untitled"}
            </p>
            <p className="text-muted-foreground text-xs capitalize">
              {item.itemType} •{" "}
              {new Date(item.lastAccessedAt).toLocaleDateString()}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "collections";

  const handleTabChange = (tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/library?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Library</h1>
          <p className="text-muted-foreground text-sm">
            Your collections, bookmarks, and recent items
          </p>
        </div>
        <Button asChild>
          <Link href="/library/collections/new">
            <Icons.Plus className="mr-2" size={16} />
            New Collection
          </Link>
        </Button>
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
      {activeTab === "collections" && <CollectionsTab />}
      {activeTab === "bookmarks" && <BookmarksTab />}
      {activeTab === "recent" && <RecentTab />}
    </div>
  );
}
