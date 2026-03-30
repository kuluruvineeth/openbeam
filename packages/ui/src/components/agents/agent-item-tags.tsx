"use client";

import { Badge } from "../badge";
import { Skeleton } from "../skeleton";

type AgentTag = {
  id: string;
  name: string;
};

type AgentItemTagsProps = {
  tags: AgentTag[];
  version?: number;
  isLoading?: boolean;
};

export function AgentItemTags({
  tags,
  version,
  isLoading,
}: AgentItemTagsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    );
  }

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
      {version !== undefined && (
        <Badge
          className="shrink-0 whitespace-nowrap rounded-full text-[10px]"
          variant="outline"
        >
          v{version}
        </Badge>
      )}
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          type="button"
        >
          <Badge className="shrink-0 whitespace-nowrap rounded-full bg-secondary text-[10px] text-muted-foreground hover:bg-accent">
            {tag.name}
          </Badge>
        </button>
      ))}
    </div>
  );
}
