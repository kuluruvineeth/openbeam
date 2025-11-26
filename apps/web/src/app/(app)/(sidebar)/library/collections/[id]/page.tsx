"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

type CollectionItem = {
  id: string;
  itemType: "document" | "search" | "link" | "note";
  itemId?: string;
  title?: string;
  description?: string;
  url?: string;
  notes?: string;
  tags?: string[];
  order: number;
  createdAt: Date;
};

type Collection = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility: "private" | "team" | "public";
  isPinned: boolean;
  items: CollectionItem[];
  createdAt: Date;
};

function CollectionItemRow({
  item,
  onRemove,
}: {
  item: CollectionItem;
  onRemove: () => void;
}) {
  const getIcon = () => {
    switch (item.itemType) {
      case "document":
        return <Icons.FileTextIcon size={18} />;
      case "search":
        return <Icons.Search size={18} />;
      case "link":
        return <Icons.LinkIcon size={18} />;
      case "note":
        return <Icons.FileIcon size={18} />;
      default:
        return <Icons.FileIcon size={18} />;
    }
  };

  return (
    <div className="group flex items-center gap-4 border-border border-b p-4 last:border-b-0">
      <div className="text-muted-foreground">{getIcon()}</div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 truncate font-medium text-foreground">
          {item.title || "Untitled"}
        </h3>
        {item.description && (
          <p className="line-clamp-1 text-muted-foreground text-sm">
            {item.description}
          </p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                className="bg-muted px-2 py-0.5 text-muted-foreground text-xs"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {item.url && (
          <Button asChild size="icon" variant="ghost">
            <a href={item.url} rel="noopener noreferrer" target="_blank">
              <Icons.ArrowRight size={16} />
            </a>
          </Button>
        )}
        <Button onClick={onRemove} size="icon" variant="ghost">
          <Icons.XIcon size={16} />
        </Button>
      </div>
    </div>
  );
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const collectionId = params.id as string;

  // Fetch collection
  const { data, isLoading, error } = useQuery(
    trpc.collections.get.queryOptions({
      collectionId,
    })
  );

  // Remove item mutation
  const removeItemMutation = useMutation(
    trpc.collections.removeItem.mutationOptions({
      onSuccess: () => {
        toast.success("Item removed");
        queryClient.invalidateQueries({
          queryKey: trpc.collections.get.queryOptions({ collectionId })
            .queryKey,
        });
      },
      onError: () => {
        toast.error("Failed to remove item");
      },
    })
  );

  // Delete collection mutation
  const deleteMutation = useMutation(
    trpc.collections.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Collection deleted");
        router.push("/library/collections");
      },
      onError: () => {
        toast.error("Failed to delete collection");
      },
    })
  );

  const collection = data as Collection | undefined;

  if (error) {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col items-center justify-center">
        <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
        <h3 className="mb-2 font-medium text-foreground">
          Collection not found
        </h3>
        <p className="mb-4 text-muted-foreground text-sm">
          This collection may have been deleted
        </p>
        <Button
          onClick={() => router.push("/library/collections")}
          variant="outline"
        >
          Back to collections
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={() => router.push("/library/collections")}
            size="icon"
            variant="ghost"
          >
            <Icons.ArrowLeft size={18} />
          </Button>
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center"
                style={{ backgroundColor: collection?.color || "#f3f4f6" }}
              >
                <Icons.KnowledgeManagement
                  className={
                    collection?.color ? "text-white" : "text-muted-foreground"
                  }
                  size={20}
                />
              </div>
              <div>
                <h1 className="font-f37-stout text-xl">
                  {collection?.name || "Collection"}
                </h1>
                {collection?.description && (
                  <p className="text-muted-foreground text-sm">
                    {collection.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            {collection && (
              <>
                <span className="capitalize">{collection.visibility}</span>
                <span>•</span>
                <span>{collection.items?.length || 0} items</span>
                <span>•</span>
                <span>
                  Created {new Date(collection.createdAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Icons.Plus className="mr-2" size={14} />
              Add Item
            </Button>
            <Button
              onClick={() => deleteMutation.mutate({ collectionId })}
              size="sm"
              variant="ghost"
            >
              <Icons.XIcon size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="border border-border bg-background">
        {isLoading && (
          <div className="space-y-4 p-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!isLoading &&
          (!collection?.items || collection.items.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icons.FileIcon
                className="mb-4 text-muted-foreground"
                size={32}
              />
              <h3 className="mb-2 font-medium text-foreground">No items yet</h3>
              <p className="mb-4 text-muted-foreground text-sm">
                Add documents, searches, or links to this collection
              </p>
              <Button variant="outline">
                <Icons.Plus className="mr-2" size={16} />
                Add Item
              </Button>
            </div>
          )}

        {!isLoading &&
          collection?.items &&
          collection.items.length > 0 &&
          collection.items.map((item) => (
            <CollectionItemRow
              item={item}
              key={item.id}
              onRemove={() =>
                removeItemMutation.mutate({
                  collectionId,
                  itemId: item.id,
                })
              }
            />
          ))}
      </div>
    </div>
  );
}
