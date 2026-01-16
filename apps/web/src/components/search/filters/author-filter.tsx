"use client";

import { Button } from "@openplane/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type AuthorFilterProps = {
  selected: string[];
  onChange: (value: string[] | null) => void;
};

export function AuthorFilter({ selected, onChange }: AuthorFilterProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();

  const { data: authorsData } = useQuery({
    ...trpc.search.authors.queryOptions({ limit: 50 }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: open,
  });

  const authors = authorsData?.authors ?? [];

  const authorMap = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string | null;
        email: string | null;
        avatarUrl: string | null;
        count: number;
      }
    >();
    for (const author of authors) {
      map.set(author.authorId, {
        name: author.authorName,
        email: author.authorEmail,
        avatarUrl: author.authorAvatarUrl,
        count: author.documentCount,
      });
    }
    return map;
  }, [authors]);

  const toggleOption = (authorId: string) => {
    if (selected.includes(authorId)) {
      const newSelection = selected.filter((s) => s !== authorId);
      onChange(newSelection.length > 0 ? newSelection : null);
    } else {
      onChange([...selected, authorId]);
    }
  };

  const selectedAuthors = selected
    .map((id) => ({ id, ...authorMap.get(id) }))
    .filter((a) => a.name || a.email);

  const renderButtonContent = () => {
    if (selectedAuthors.length === 1) {
      const author = selectedAuthors[0];
      return (
        <>
          <Avatar className="size-4">
            {author?.avatarUrl && <AvatarImage src={author.avatarUrl} />}
            <AvatarFallback className="text-[8px]">
              {getInitials(author?.name ?? null)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[100px] truncate">
            {author?.name || author?.email || "Unknown"}
          </span>
        </>
      );
    }

    if (selectedAuthors.length > 1) {
      return (
        <>
          <div className="-space-x-1 flex">
            {selectedAuthors.slice(0, 3).map((a) => (
              <Avatar className="size-4 border border-background" key={a.id}>
                {a.avatarUrl && <AvatarImage src={a.avatarUrl} />}
                <AvatarFallback className="text-[8px]">
                  {getInitials(a.name ?? null)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span>{selected.length} people</span>
        </>
      );
    }

    return (
      <>
        <Icons.User className="text-foreground/50" size={14} />
        Who from
      </>
    );
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 gap-2 border-border/50 px-3 text-xs",
            selected.length > 0 && "bg-foreground/5"
          )}
          size="sm"
          variant="outline"
        >
          {renderButtonContent()}
          <Icons.ChevronDown className="text-foreground/40" size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0">
        <Command>
          <CommandInput placeholder="Search people..." />
          <CommandList className="no-scrollbar">
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup>
              {authors.map((author) => (
                <CommandItem
                  key={author.authorId}
                  onSelect={() => toggleOption(author.authorId)}
                >
                  <div
                    className={cn(
                      "mr-2 flex size-4 items-center justify-center border border-border/50",
                      selected.includes(author.authorId) &&
                        "bg-foreground text-background"
                    )}
                  >
                    {selected.includes(author.authorId) && (
                      <Icons.CheckIcon size={10} />
                    )}
                  </div>
                  <Avatar className="mr-2 size-5">
                    {author.authorAvatarUrl && (
                      <AvatarImage src={author.authorAvatarUrl} />
                    )}
                    <AvatarFallback className="text-[9px]">
                      {getInitials(author.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">
                      {author.authorName || "Unknown"}
                    </span>
                    {author.authorEmail && (
                      <span className="truncate text-[10px] text-foreground/50">
                        {author.authorEmail}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-foreground/40">
                    {author.documentCount}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <div className="border-border/40 border-t p-1">
              <Button
                className="h-7 w-full text-xs"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                size="sm"
                variant="ghost"
              >
                Clear selection
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
