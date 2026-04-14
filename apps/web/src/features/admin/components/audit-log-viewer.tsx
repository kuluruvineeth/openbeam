"use client";

import { Badge, Button, Skeleton } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";

export function AuditLogViewer() {
  const trpc = useTRPC();
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading } = useQuery(
    trpc.admin.audit.list.queryOptions({ cursor, limit: 20 })
  );

  if (isLoading) {
    return <AuditSkeleton />;
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-border/50">
        <div className="flex items-center gap-4 border-border/50 border-b bg-foreground/3 px-4 py-2 font-mono text-[10px] text-muted-foreground uppercase">
          <span className="w-32">Time</span>
          <span className="w-20">Category</span>
          <span className="flex-1">Action</span>
          <span className="w-32">User</span>
        </div>
        {items.map((log) => (
          <div
            className="flex items-center gap-4 border-border/50 border-b px-4 py-2 last:border-b-0"
            key={log.id}
          >
            <span className="w-32 font-mono text-muted-foreground text-xs tabular-nums">
              {new Date(log.createdAt).toLocaleString()}
            </span>
            <div className="w-20">
              <Badge className="font-mono text-[10px]" variant="outline">
                {log.category}
              </Badge>
            </div>
            <span className="flex-1 text-sm">{log.action}</span>
            <span className="w-32 truncate text-muted-foreground text-xs">
              {log.user?.name ?? log.user?.email ?? log.userId.slice(0, 8)}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No audit logs yet
          </div>
        )}
      </div>
      {data?.hasMore && (
        <Button
          onClick={() => setCursor(data.nextCursor)}
          size="sm"
          variant="outline"
        >
          Load more
        </Button>
      )}
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div className="flex items-center gap-3 px-4 py-2" key={`as-${i}`}>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-40 flex-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
