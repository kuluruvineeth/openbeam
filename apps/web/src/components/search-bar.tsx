"use client";

import { forwardRef, useEffect, useRef } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Autocomplete } from "./search-bar/autocomplete";
import { SearchFilters } from "./search-bar/search-filters";

type AutocompleteResult = {
  type: "file" | "user_query";
  title?: string;
  query_text?: string;
};

type SearchFilter = {
  lastUpdated?: string;
};

type Props = {
  autocompleteResults?: AutocompleteResult[];
  setQuery: (query: string) => void;
  setAutocompleteResults?: (results: AutocompleteResult[]) => void;
  setAutocompleteQuery?: (query: string) => void;
  setOffset?: (offset: number) => void;
  setFilter?: (
    filter: SearchFilter | ((prev: SearchFilter) => SearchFilter)
  ) => void;
  query: string;
  handleSearch?: () => void;
  handleAnswer?: () => void;
  filter?: SearchFilter;
  onLastUpdated?: (value: string) => void;
  hasSearched?: boolean;
  setActiveQuery?: (query: string) => void;
};

export const SearchBar = forwardRef<HTMLDivElement, Props>(
  (
    {
      autocompleteResults = [],
      setQuery,
      setAutocompleteResults,
      setAutocompleteQuery,
      setOffset,
      setFilter,
      query,
      handleSearch,
      handleAnswer,
      filter,
      onLastUpdated,
      hasSearched = false,
    },
    _autocompleteRef
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const trimmedQuery = query.trim();

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (trimmedQuery) {
          setOffset?.(0);
          handleSearch?.();
          setFilter?.((prevFilter: SearchFilter) => ({
            lastUpdated: prevFilter?.lastUpdated || "anytime",
          }));
        }
        if (query.split(" ").length > 2) {
          handleAnswer?.();
        }
      }
    };

    const handleClear = () => {
      setQuery("");
      inputRef.current?.focus();
    };

    const handleSubmit = () => {
      if (trimmedQuery) {
        handleSearch?.();
      }
    };

    const handleAutocompleteSelect = (result: AutocompleteResult) => {
      if (result.type === "file") {
        setQuery(result.title || "");
      } else if (result.type === "user_query") {
        setQuery(result.query_text || "");
      }
      setAutocompleteResults?.([]);
    };

    return (
      <div
        className={cn(
          "flex flex-col bg-background",
          hasSearched &&
            "sticky top-0 z-10 justify-center border-border border-b pt-3"
        )}
      >
        <div
          className={cn(
            "flex w-full max-w-3xl flex-col",
            hasSearched && "ml-[186px]"
          )}
        >
          <div className="flex w-full">
            <div className="relative w-full">
              <div
                className={cn(
                  "flex h-[52px] w-full items-center border transition-colors",
                  autocompleteResults.length > 0 && "border-b-0",
                  hasSearched
                    ? "border-transparent bg-transparent"
                    : "border-border bg-background"
                )}
              >
                <Icons.Search
                  className="mr-2 ml-4 text-muted-foreground"
                  size={18}
                />

                <Input
                  className={cn(
                    "flex-1 border-0 bg-transparent font-[450] text-[15px] text-foreground leading-[24px] placeholder:text-muted-foreground focus-visible:ring-0"
                  )}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setAutocompleteQuery?.(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search anything across apps..."
                  ref={inputRef}
                  value={query}
                />

                {hasSearched ? (
                  <Button
                    className="mr-4 text-muted-foreground hover:text-foreground"
                    onClick={handleClear}
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.Close size={20} />
                  </Button>
                ) : (
                  <Button
                    className="mr-2 h-8 w-8"
                    disabled={!trimmedQuery}
                    onClick={handleSubmit}
                    size="icon"
                    variant="default"
                  >
                    <Icons.ArrowRight className="h-4 w-4" />
                  </Button>
                )}

                <div ref={_autocompleteRef as React.RefObject<HTMLDivElement>}>
                  <Autocomplete
                    onSelect={handleAutocompleteSelect}
                    results={autocompleteResults}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasSearched && (
          <div className="ml-[230px]">
            <SearchFilters filter={filter} onLastUpdated={onLastUpdated} />
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";
