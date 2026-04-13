"use client";

import { Skeleton } from "@openbeam/ui";
import { Command as CommandPrimitive } from "cmdk";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { getConnectorApp } from "../lib/display";
import type {
  AutocompleteDocSuggestion,
  AutocompleteEntitySuggestion,
  AutocompleteSuggestion,
} from "../types";

type Props = {
  entities: AutocompleteEntitySuggestion[];
  documents: AutocompleteDocSuggestion[];
  isFetching: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  onExpandAll: () => void;
};

const ENTITY_TYPE_ICONS: Record<string, typeof Icons.User> = {
  PERSON: Icons.User,
  PROJECT: Icons.Folder,
  TEAM: Icons.Users,
  TOPIC: Icons.Tags,
};

function EntityItem({
  entity,
  onSelect,
}: {
  entity: AutocompleteEntitySuggestion;
  onSelect: () => void;
}) {
  const Icon = ENTITY_TYPE_ICONS[entity.entityType] ?? Icons.Tags;

  return (
    <CommandPrimitive.Item
      className="relative flex w-full cursor-default select-none items-center gap-3 px-3 py-2 outline-none data-[selected=true]:bg-foreground/5"
      onSelect={onSelect}
      value={`entity-${entity.id}`}
    >
      <div className="flex size-6 shrink-0 items-center justify-center bg-foreground/3">
        <Icon size={12} />
      </div>
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/90">
        {entity.label}
      </span>
      <span className="shrink-0 font-mono text-[9px] text-foreground/40 uppercase">
        {entity.entityType.toLowerCase()}
      </span>
    </CommandPrimitive.Item>
  );
}

function DocumentItem({
  doc,
  onSelect,
}: {
  doc: AutocompleteDocSuggestion;
  onSelect: () => void;
}) {
  const app = doc.connectorType ? getConnectorApp(doc.connectorType) : null;

  return (
    <CommandPrimitive.Item
      className="relative flex w-full cursor-default select-none items-center gap-3 px-3 py-2 outline-none data-[selected=true]:bg-foreground/5"
      onSelect={onSelect}
      value={`doc-${doc.id}`}
    >
      <div className="flex size-6 shrink-0 items-center justify-center bg-foreground/3">
        {app ? <AppLogo app={app} size={12} /> : <Icons.FileIcon size={12} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-foreground/90">{doc.label}</p>
        {doc.snippet && (
          <p className="truncate font-mono text-[10px] text-foreground/40">
            {doc.snippet}
          </p>
        )}
      </div>
    </CommandPrimitive.Item>
  );
}

function DropdownSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 3 }, (_, i) => (
        <div className="flex items-center gap-3 px-2 py-1.5" key={`skel-${i}`}>
          <Skeleton className="size-6" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

function DropdownEmpty() {
  return (
    <div className="flex flex-col items-center gap-1 py-8">
      <Icons.Search className="text-foreground/20" size={20} />
      <span className="text-foreground/50 text-xs">No results found</span>
      <span className="text-[10px] text-foreground/30">
        Press Enter to search everything
      </span>
    </div>
  );
}

function DropdownFooter({ onExpandAll }: { onExpandAll: () => void }) {
  return (
    <div className="flex items-center justify-between border-border/40 border-t px-3 py-2">
      <div className="flex items-center gap-3 font-mono text-[10px] text-foreground/40">
        <span className="flex items-center gap-1">
          <kbd className="border border-border/50 bg-foreground/3 px-1">↑↓</kbd>
          navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="border border-border/50 bg-foreground/3 px-1">↵</kbd>
          select
        </span>
      </div>
      <button
        className="font-mono text-[10px] text-foreground/50 transition-colors hover:text-foreground/70"
        onClick={onExpandAll}
        type="button"
      >
        View all results →
      </button>
    </div>
  );
}

export function SearchCommandDropdown({
  entities,
  documents,
  isFetching,
  onSelect,
  onExpandAll,
}: Props) {
  const hasResults = entities.length > 0 || documents.length > 0;

  return (
    <div className="absolute top-full right-0 left-0 z-50 border border-border/50 border-t-0 bg-background">
      <CommandPrimitive.List className="max-h-[320px] overflow-y-auto overflow-x-hidden">
        {isFetching && !hasResults && <DropdownSkeleton />}
        {!(isFetching || hasResults) && (
          <CommandPrimitive.Empty asChild>
            <DropdownEmpty />
          </CommandPrimitive.Empty>
        )}

        {entities.length > 0 && (
          <CommandPrimitive.Group
            heading={
              <span className="px-3 py-1.5 font-mono text-[10px] text-foreground/40 uppercase">
                People & Entities
              </span>
            }
          >
            {entities.map((e) => (
              <EntityItem entity={e} key={e.id} onSelect={() => onSelect(e)} />
            ))}
          </CommandPrimitive.Group>
        )}

        {documents.length > 0 && (
          <CommandPrimitive.Group
            heading={
              <span className="px-3 py-1.5 font-mono text-[10px] text-foreground/40 uppercase">
                Documents
              </span>
            }
          >
            {documents.map((d) => (
              <DocumentItem doc={d} key={d.id} onSelect={() => onSelect(d)} />
            ))}
          </CommandPrimitive.Group>
        )}
      </CommandPrimitive.List>
      <DropdownFooter onExpandAll={onExpandAll} />
    </div>
  );
}
