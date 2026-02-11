"use client";

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Icons,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openplane/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { groupSessionsByDate } from "../../lib/group-sessions-by-date";

type SessionItem = {
  id: string;
  title: string | null;
  status: string;
  updatedAt: string;
  createdAt: string;
};

interface SessionSwitcherProps {
  canvasId: string;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionSwitcher({
  canvasId,
  currentSessionId,
  onSessionSelect,
  onNewSession,
}: SessionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const listQueryOptions = trpc.agentCanvas.listSessions.queryOptions({
    canvasId,
    limit: 50,
  });

  const { data: sessions } = useQuery({
    ...listQueryOptions,
    enabled: open,
  });

  const archiveOptions = trpc.agentCanvas.archiveSession.mutationOptions();

  const archiveMutation = useMutation({
    mutationFn: archiveOptions.mutationFn,
    onMutate: async ({ sessionId }: { sessionId: string }) => {
      await queryClient.cancelQueries({ queryKey: listQueryOptions.queryKey });
      const previous = queryClient.getQueryData(listQueryOptions.queryKey);
      queryClient.setQueryData(
        listQueryOptions.queryKey,
        (old: typeof previous) => old?.filter((s) => s.id !== sessionId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listQueryOptions.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey });
    },
  });

  const sessionItems: SessionItem[] = useMemo(() => {
    if (!sessions) {
      return [];
    }
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      updatedAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }, [sessions]);

  const groups = useMemo(
    () => groupSessionsByDate(sessionItems),
    [sessionItems]
  );

  const currentTitle = useMemo(() => {
    const current = sessionItems.find((s) => s.id === currentSessionId);
    return current?.title ?? "New chat";
  }, [sessionItems, currentSessionId]);

  const handleSelect = useCallback(
    (sessionId: string) => {
      if (sessionId !== currentSessionId) {
        onSessionSelect(sessionId);
      }
      setOpen(false);
    },
    [currentSessionId, onSessionSelect]
  );

  const handleNewSession = useCallback(() => {
    onNewSession();
    setOpen(false);
  }, [onNewSession]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      archiveMutation.mutate({ sessionId });
      if (sessionId === currentSessionId) {
        setOpen(false);
        onNewSession();
      }
    },
    [archiveMutation, currentSessionId, onNewSession]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className="h-7 max-w-[200px] gap-1.5 px-2 font-normal text-xs"
          variant="ghost"
        >
          <span className="truncate">{currentTitle}</span>
          <Icons.ChevronDown className="shrink-0 opacity-50" size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0">
        <Command>
          <CommandInput placeholder="Search sessions..." />
          <CommandList className="no-scrollbar max-h-[300px]">
            <CommandGroup>
              <CommandItem onSelect={handleNewSession}>
                <Icons.Plus className="mr-2 shrink-0" size={14} />
                New chat
              </CommandItem>
            </CommandGroup>

            {groups.length > 0 && <CommandSeparator />}

            {groups.map((group) => (
              <CommandGroup heading={group.label} key={group.label}>
                {group.sessions.map((session) => (
                  <CommandItem
                    className="group/session"
                    key={session.id}
                    onSelect={() => handleSelect(session.id)}
                    value={`${session.title ?? "New chat"} ${session.id}`}
                  >
                    <Icons.MessageSquare
                      className="mr-2 shrink-0 text-muted-foreground"
                      size={14}
                    />
                    <span className="flex-1 truncate">
                      {session.title ?? "New chat"}
                    </span>
                    <span className="ml-2 shrink-0 text-muted-foreground text-xs group-hover/session:hidden">
                      {formatDistanceToNow(new Date(session.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {session.id === currentSessionId && (
                      <span className="ml-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary group-hover/session:hidden" />
                    )}
                    <button
                      className="ml-1.5 hidden shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-destructive group-hover/session:block"
                      onClick={(e) => handleDelete(e, session.id)}
                      type="button"
                    >
                      <Icons.Trash size={12} />
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            <CommandEmpty>No sessions</CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
