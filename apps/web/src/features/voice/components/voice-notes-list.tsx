"use client";

import { Input } from "@openbeam/ui";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import { useDeleteVoiceNote, useVoiceNotes } from "../hooks/use-voice-notes";
import { VoiceNoteItem, VoiceNoteItemSkeleton } from "./voice-note-item";

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
        <div className="absolute top-1/3 left-1/3">
          <Icons.Mic size={80} />
        </div>
      </div>
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center border border-border/50 bg-background">
          <Icons.Mic className="text-foreground/30" size={18} />
        </div>
        <p className="font-medium text-foreground/70 text-sm">
          {hasSearch ? "No notes match your search" : "No voice notes yet"}
        </p>
        <p className="mt-1 text-foreground/40 text-xs">
          {hasSearch
            ? "Try a different search term"
            : "Notes appear after you record them"}
        </p>
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div>
      {Array.from({ length: 4 }, (_, i) => (
        <VoiceNoteItemSkeleton key={`note-skeleton-${i}`} />
      ))}
    </div>
  );
}

export function VoiceNotesList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { ref, inView } = useInView();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useVoiceNotes(debouncedSearch || undefined);

  const deleteMutation = useDeleteVoiceNote();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const notes = data?.pages.flatMap((p) => p.notes) ?? [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icons.Search
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 text-foreground/30"
          size={14}
        />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          value={search}
        />
      </div>

      <div className="rounded-sm border border-border/50">
        {isLoading && <NotesSkeleton />}
        {!isLoading && notes.length === 0 && (
          <EmptyState hasSearch={debouncedSearch.length > 0} />
        )}
        {!isLoading && notes.length > 0 && (
          <ol aria-label="Voice notes" className="list-none">
            {notes.map((note) => (
              <li key={note.id}>
                <VoiceNoteItem
                  isDeleting={deleteMutation.isPending}
                  note={note}
                  onDelete={(noteId) => deleteMutation.mutate({ noteId })}
                />
              </li>
            ))}
            {(hasNextPage || isFetchingNextPage) && (
              <li className="flex justify-center py-3" ref={ref}>
                {isFetchingNextPage && (
                  <Icons.Loader2Icon
                    className="animate-spin text-foreground/30"
                    size={14}
                  />
                )}
              </li>
            )}
          </ol>
        )}
      </div>

      {data?.pages[0]?.total != null && notes.length > 0 && (
        <p className="text-foreground/30 text-xs">
          {notes.length} of {data.pages[0].total} notes
        </p>
      )}
    </div>
  );
}
