"use client";

import { appStore } from "@openplane/integrations";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type SearchResultDocument,
  useRecentDocuments,
  useSearchAutocomplete,
} from "@/hooks/use-search";
import { getContentPreview } from "@/lib/format";
import { getDocumentTypeLabel } from "@/lib/search-display";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

type Suggestion = {
  id: string;
  title: string;
  content?: string;
  documentType: string;
  connectorType?: string;
  sourceName?: string;
};

function SuggestionIcon({
  connectorType,
  documentType,
}: {
  connectorType?: string;
  documentType: string;
}) {
  const app = appStore.find(
    (a) => a.id.toLowerCase() === (connectorType ?? documentType).toLowerCase()
  );

  if (app) {
    return <AppLogo app={app} size={14} />;
  }
  return <Icons.FileIcon className="text-foreground/40" size={14} />;
}

function getDisplayText(item: Suggestion): string {
  const docType = item.documentType?.toLowerCase();
  const title = item.title?.trim();
  const content = item.content?.trim();

  if (docType === "message" && content) {
    return getContentPreview(content, 80);
  }

  if (title && content) {
    const lowerTitle = title.toLowerCase();
    if (
      lowerTitle.startsWith("message in") ||
      lowerTitle.startsWith("email from") ||
      lowerTitle.startsWith("file in")
    ) {
      return getContentPreview(content, 80);
    }
  }

  if (title && title !== item.sourceName) {
    return title;
  }

  if (content) {
    return getContentPreview(content, 80);
  }

  return title || "Untitled";
}

function SuggestionRow({
  item,
  isSelected,
  onClick,
  showRecent,
}: {
  item: Suggestion;
  isSelected: boolean;
  onClick: () => void;
  showRecent?: boolean;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const displayText = getDisplayText(item);
  const typeLabel = getDocumentTypeLabel(
    item.connectorType ?? "",
    item.documentType
  );

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
        isSelected
          ? "bg-foreground/8 text-foreground"
          : "text-foreground/80 hover:bg-foreground/4"
      )}
      onClick={onClick}
      ref={rowRef}
      type="button"
    >
      {showRecent ? (
        <Icons.Clock className="shrink-0 text-foreground/40" size={14} />
      ) : (
        <SuggestionIcon
          connectorType={item.connectorType}
          documentType={item.documentType}
        />
      )}
      <span className="min-w-0 flex-1 truncate text-[13px]">{displayText}</span>
      <span className="shrink-0 text-[10px] text-foreground/40 uppercase tracking-wide">
        {typeLabel}
      </span>
    </button>
  );
}

function AutocompleteDropdown({
  suggestions,
  isLoading,
  recentDocuments,
  selectedIndex,
  onSelect,
  query,
}: {
  suggestions: Suggestion[];
  isLoading: boolean;
  recentDocuments: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  query: string;
}) {
  const showRecent = query.length < 2 && recentDocuments.length > 0;
  const showSuggestions = query.length >= 2;

  if (!(showRecent || showSuggestions)) {
    return null;
  }
  const items = showRecent ? recentDocuments : suggestions;

  return (
    <div className="absolute top-full right-0 left-0 z-50 border border-border/50 border-t-0 bg-background shadow-lg">
      <div className="border-border/40 border-b px-3 py-1.5">
        <span className="font-medium text-[10px] text-foreground/50 uppercase tracking-wide">
          {showRecent ? "Recent" : "Suggestions"}
        </span>
      </div>

      {isLoading && showSuggestions && (
        <div className="space-y-1 p-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="flex items-center gap-3 px-2 py-1" key={i}>
              <Skeleton className="size-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="max-h-[280px] overflow-y-auto">
          {items.map((item, index) => (
            <SuggestionRow
              isSelected={index === selectedIndex}
              item={item}
              key={item.id}
              onClick={() => onSelect(item)}
              showRecent={showRecent}
            />
          ))}
        </div>
      )}

      {showSuggestions && !isLoading && suggestions.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-6">
          <Icons.Search className="text-foreground/20" size={20} />
          <span className="text-foreground/50 text-xs">No suggestions</span>
          <span className="text-[10px] text-foreground/30">
            Press Enter to search
          </span>
        </div>
      )}

      <div className="flex items-center justify-between border-border/40 border-t px-3 py-1.5 text-[10px] text-foreground/40">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/50 bg-foreground/3 px-1">
              ↑
            </kbd>
            <kbd className="rounded border border-border/50 bg-foreground/3 px-1">
              ↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/50 bg-foreground/3 px-1">
              ↵
            </kbd>
            select
          </span>
        </div>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border/50 bg-foreground/3 px-1">
            esc
          </kbd>
          close
        </span>
      </div>
    </div>
  );
}

function mapDocumentToSuggestion(doc: SearchResultDocument): Suggestion {
  return {
    id: doc.id,
    title: doc.title || doc.file_name || "",
    content: doc.content,
    documentType: doc.document_type,
    connectorType: doc.connector_type,
    sourceName: doc.source_name,
  };
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Search anything across your apps...",
  autoFocus = true,
  className,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const { data: autocompleteData, isFetching: isLoadingAutocomplete } =
    useSearchAutocomplete(value, {
      enabled: isFocused && value.length >= 2,
    });

  const { data: recentData } = useRecentDocuments({ limit: 5 });

  const suggestions: Suggestion[] =
    autocompleteData?.suggestions?.map((s: Suggestion) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      documentType: s.documentType,
      connectorType: s.connectorType,
      sourceName: s.sourceName,
    })) ?? [];

  const recentDocuments: Suggestion[] =
    recentData?.documents?.map(mapDocumentToSuggestion) ?? [];

  const showDropdown =
    isFocused &&
    (value.length >= 2 || (value.length < 2 && recentDocuments.length > 0));

  const currentItems = value.length >= 2 ? suggestions : recentDocuments;

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      inputRef.current?.focus();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "escape",
    () => {
      if (showDropdown) {
        setSelectedIndex(-1);
        inputRef.current?.blur();
      } else if (value) {
        onChange("");
      } else {
        inputRef.current?.blur();
      }
    },
    { enableOnFormTags: true, enabled: isFocused }
  );

  useHotkeys(
    "down",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < currentItems.length - 1 ? prev + 1 : prev
      );
    },
    { enableOnFormTags: true, enabled: showDropdown }
  );

  useHotkeys(
    "up",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    },
    { enableOnFormTags: true, enabled: showDropdown }
  );

  useHotkeys(
    "enter",
    (e) => {
      if (selectedIndex >= 0 && currentItems[selectedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(currentItems[selectedIndex]);
      }
    },
    { enableOnFormTags: true, enabled: showDropdown && selectedIndex >= 0 }
  );

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions.length, value]);

  const handleSelectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      const searchText = getDisplayText(suggestion);
      onChange(searchText);
      setSelectedIndex(-1);
      inputRef.current?.focus();
      onSearch?.();
    },
    [onChange, onSearch]
  );

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 200);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex h-12 w-full items-center gap-3 border border-border/50 bg-background px-4 transition-all duration-200",
          "focus-within:border-foreground/20 focus-within:ring-1 focus-within:ring-foreground/5",
          showDropdown && "border-b-transparent"
        )}
      >
        <Icons.Search className="shrink-0 text-foreground/40" size={18} />

        <Input
          className={cn(
            "h-full flex-1 border-0 bg-transparent px-0 text-[15px] text-foreground placeholder:text-foreground/40",
            "focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
          onBlur={handleBlur}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          ref={inputRef}
          spellCheck={false}
          type="text"
          value={value}
        />

        {isLoadingAutocomplete && value.length >= 2 && (
          <Icons.Spinner
            className="shrink-0 animate-spin text-foreground/30"
            size={14}
          />
        )}

        {value ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex shrink-0 items-center justify-center text-foreground/40 transition-colors hover:text-foreground/70"
                  onClick={handleClear}
                  type="button"
                >
                  <Icons.Close size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Clear search</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <kbd className="hidden shrink-0 cursor-default items-center gap-1 font-mono text-[10px] text-foreground/30 sm:flex">
                  <span className="rounded border border-border/50 bg-foreground/3 px-1.5 py-0.5">
                    ⌘K
                  </span>
                </kbd>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Focus search</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {showDropdown && (
        <AutocompleteDropdown
          isLoading={isLoadingAutocomplete}
          onSelect={handleSelectSuggestion}
          query={value}
          recentDocuments={recentDocuments}
          selectedIndex={selectedIndex}
          suggestions={suggestions}
        />
      )}
    </div>
  );
}
