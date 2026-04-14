"use client";

import { Badge, Skeleton } from "@openbeam/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";

export function TeamManagement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useQuery(
    trpc.admin.members.list.queryOptions()
  );

  const removeMutation = useMutation({
    ...trpc.admin.members.remove.mutationOptions(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: trpc.admin.members.list.queryKey(),
      }),
  });

  if (isLoading) {
    return <MembersSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border/50">
        <div className="flex items-center gap-4 border-border/50 border-b bg-foreground/3 px-4 py-2 font-mono text-[10px] text-muted-foreground uppercase">
          <span className="flex-1">Member</span>
          <span className="w-20">Role</span>
          <span className="w-16" />
        </div>
        {(members ?? []).map((member) => (
          <div
            className="flex items-center gap-4 border-border/50 border-b px-4 py-2.5 last:border-b-0"
            key={member.userId}
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="flex size-7 items-center justify-center bg-foreground/5 font-medium text-xs">
                {(member.name ?? member.email)?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-sm">{member.name ?? "Unnamed"}</p>
                <p className="text-muted-foreground text-xs">{member.email}</p>
              </div>
            </div>
            <div className="w-20">
              <Badge className="font-mono text-[10px]" variant="outline">
                {member.role}
              </Badge>
            </div>
            <div className="flex w-16 justify-end">
              {member.role !== "OWNER" && (
                <button
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() =>
                    removeMutation.mutate({ userId: member.userId })
                  }
                  type="button"
                >
                  <Icons.Trash size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="rounded-sm border border-border/50">
      <div className="flex items-center gap-4 border-border/50 border-b bg-foreground/3 px-4 py-2">
        <Skeleton className="h-2.5 w-14 flex-1" />
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-8" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          className="flex items-center gap-4 border-border/50 border-b px-4 py-2.5 last:border-b-0"
          key={`ms-${i}`}
        >
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="size-7 shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-48" />
            </div>
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="size-4" />
        </div>
      ))}
    </div>
  );
}
