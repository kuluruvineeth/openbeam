"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Citation = {
  docId: string;
  title: string;
  url?: string;
  app?: string;
  entity?: string;
};

type SearchResult = {
  docId: string;
  title?: string;
  name?: string;
  subject?: string;
  filename?: string;
  app?: string;
  entity?: string;
  from?: string;
  timestamp?: number;
};

type Props = {
  isOpen: boolean;
  searchMode: "citations" | "global";
  citations: Citation[];
  globalResults: SearchResult[];
  selectedIndex: number;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSelectCitation: (citation: Citation) => void;
  onSelectResult: (result: SearchResult) => void;
  isLoading?: boolean;
  error?: string | null;
  positionLeft?: number;
};

export function ReferenceBox({
  isOpen,
  searchMode,
  citations,
  globalResults,
  selectedIndex,
  searchTerm,
  onSearchTermChange,
  onSelectCitation,
  onSelectResult,
  isLoading = false,
  error = null,
  positionLeft = 0,
}: Props) {
  if (!isOpen) {
    return null;
  }

  const renderCitationsContent = () => {
    if (citations.length > 0) {
      return citations.map((citation, index) => (
        <Button
          className={cn(
            "w-full cursor-pointer justify-start p-2 text-left hover:bg-accent",
            index === selectedIndex && "bg-accent"
          )}
          key={citation.docId}
          onClick={() => onSelectCitation(citation)}
          variant="ghost"
        >
          <div className="flex items-center gap-2">
            <Icons.LinkIcon className="text-muted-foreground" size={16} />
            <p className="truncate font-medium text-foreground text-sm">
              {citation.title}
            </p>
          </div>
          {citation.url && (
            <p className="ml-6 truncate text-muted-foreground text-xs">
              {citation.url}
            </p>
          )}
        </Button>
      ));
    }
    if (searchTerm.length > 0) {
      return (
        <p className="px-2 py-1 text-center text-muted-foreground text-sm">
          No citations found for "{searchTerm}".
        </p>
      );
    }
    return (
      <p className="px-2 py-1 text-center text-muted-foreground text-sm">
        Start typing to search citations from this chat.
      </p>
    );
  };

  return (
    <div
      className="absolute bottom-[calc(80%+8px)] z-10 flex max-w-full flex-col border border-border bg-popover shadow-sm"
      style={{
        left: `${positionLeft}px`,
        width: "400px",
      }}
    >
      <div className="relative border-border border-b p-2">
        <Icons.SearchIcon className="-translate-y-1/2 absolute top-1/2 left-4 h-4 w-4 transform text-muted-foreground" />
        <Input
          className="w-full border-0 bg-transparent py-1.5 pr-2 pl-8 text-sm focus-visible:ring-0"
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Search globally..."
          type="text"
          value={searchTerm}
        />
      </div>
      <div className="max-h-[250px] min-h-[40px] overflow-y-auto p-1">
        {searchMode === "citations" && renderCitationsContent()}

        {searchMode === "global" && (
          <>
            {isLoading && globalResults.length === 0 && !error && (
              <p className="px-2 py-1 text-center text-muted-foreground text-sm">
                {searchTerm
                  ? `Searching for "${searchTerm}"...`
                  : "Searching..."}
              </p>
            )}
            {error && (
              <p className="px-2 py-1 text-center text-destructive text-sm">
                {error}
              </p>
            )}
            {!(isLoading || error) &&
              globalResults.length === 0 &&
              searchTerm && (
                <p className="px-2 py-1 text-center text-muted-foreground text-sm">
                  No results found for "{searchTerm}".
                </p>
              )}
            {!(isLoading || error) &&
              globalResults.length === 0 &&
              !searchTerm && (
                <p className="px-2 py-1 text-center text-muted-foreground text-sm">
                  Type to search for documents, messages, and more.
                </p>
              )}
            {globalResults.length > 0 &&
              globalResults.map((result, index) => {
                const displayTitle =
                  result.name ||
                  result.subject ||
                  result.title ||
                  result.filename ||
                  "Untitled";
                return (
                  <Button
                    className={cn(
                      "w-full cursor-pointer justify-start p-2 text-left hover:bg-accent",
                      index === selectedIndex && "bg-accent"
                    )}
                    key={result.docId || index}
                    onClick={() => onSelectResult(result)}
                    variant="ghost"
                  >
                    <div className="flex items-center gap-2">
                      <Icons.LinkIcon
                        className="text-muted-foreground"
                        size={16}
                      />
                      <p className="truncate font-medium text-foreground text-sm">
                        {displayTitle}
                      </p>
                    </div>
                    {result.from && (
                      <p className="ml-6 truncate text-muted-foreground text-xs">
                        From: {result.from}
                      </p>
                    )}
                  </Button>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}
