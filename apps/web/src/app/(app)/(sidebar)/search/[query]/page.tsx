"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Documents", value: "document" },
  { label: "Messages", value: "message" },
  { label: "Spreadsheets", value: "spreadsheet" },
  { label: "Presentations", value: "presentation" },
];

const TIME_FILTERS = [
  { label: "Any time", value: "anytime" },
  { label: "Past 24 hours", value: "day" },
  { label: "Past week", value: "week" },
  { label: "Past month", value: "month" },
  { label: "Past year", value: "year" },
];

type SearchResult = {
  id: string;
  title: string;
  content?: string;
  documentType?: string;
  connectorType?: string;
  url?: string;
  authorName?: string;
  updatedAt?: number;
  score?: number;
};

function SearchResultItem({ result }: { result: SearchResult }) {
  const getIcon = () => {
    switch (result.documentType) {
      case "spreadsheet":
        return <Icons.FileSpreadsheetIcon size={20} />;
      case "presentation":
        return <Icons.PresentationIcon size={20} />;
      case "image":
        return <Icons.FileImageIcon size={20} />;
      default:
        return <Icons.FileTextIcon size={20} />;
    }
  };

  return (
    <a
      className="group block border-border border-b p-4 transition-colors last:border-b-0 hover:bg-accent/50"
      href={result.url || "#"}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 text-muted-foreground">{getIcon()}</div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 truncate font-medium text-foreground group-hover:text-primary">
            {result.title}
          </h3>
          {result.content && (
            <p className="mb-2 line-clamp-2 text-muted-foreground text-sm">
              {result.content}
            </p>
          )}
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            {result.connectorType && (
              <span className="capitalize">{result.connectorType}</span>
            )}
            {result.authorName && <span>by {result.authorName}</span>}
            {result.updatedAt && (
              <span>{new Date(result.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <Button
          className="opacity-0 group-hover:opacity-100"
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowRight size={16} />
        </Button>
      </div>
    </a>
  );
}

function SearchResultSkeleton() {
  return (
    <div className="border-border border-b p-4 last:border-b-0">
      <div className="flex items-start gap-4">
        <Skeleton className="h-5 w-5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const decodedQuery = decodeURIComponent(params.query as string);

  const [query, setQuery] = useState(decodedQuery);
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("anytime");

  // Search query
  const { data, isLoading, error } = useQuery(
    trpc.search.search.queryOptions({
      query: decodedQuery,
      documentTypes: typeFilter !== "all" ? [typeFilter] : undefined,
      limit: 20,
      offset: 0,
      ranking: "hybrid",
    })
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && query.trim() !== decodedQuery) {
      router.push(`/search/${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSaveSearch = () => {
    // TODO: Implement save search via trpc.search.createSaved
  };

  const results = (data?.documents || []) as SearchResult[];
  const totalResults = data?.total || 0;

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Search Header */}
      <form className="mb-6" onSubmit={handleSearch}>
        <div className="flex h-12 items-center border border-border bg-background">
          <Icons.Search className="ml-4 text-muted-foreground" size={18} />
          <Input
            className="flex-1 border-0 bg-transparent text-base focus-visible:ring-0"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            value={query}
          />
          <div className="mr-2 flex items-center gap-2">
            <Button
              onClick={handleSaveSearch}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Icons.Plus size={16} />
              Save
            </Button>
            <Button disabled={!query.trim()} size="sm" type="submit">
              Search
            </Button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((filter) => (
            <button
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                typeFilter === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              key={filter.value}
              onClick={() => setTypeFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border" />

        <select
          className="border-0 bg-transparent text-muted-foreground text-sm focus:ring-0"
          onChange={(e) => setTimeFilter(e.target.value)}
          value={timeFilter}
        >
          {TIME_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      {!(isLoading || error) && (
        <p className="mb-4 text-muted-foreground text-sm">
          {totalResults > 0
            ? `Found ${totalResults} result${totalResults !== 1 ? "s" : ""} for "${decodedQuery}"`
            : `No results found for "${decodedQuery}"`}
        </p>
      )}

      {/* Results */}
      <div className="border border-border bg-background">
        {isLoading && (
          <>
            <SearchResultSkeleton />
            <SearchResultSkeleton />
            <SearchResultSkeleton />
            <SearchResultSkeleton />
            <SearchResultSkeleton />
          </>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
            <h3 className="mb-2 font-medium text-foreground">Search failed</h3>
            <p className="text-muted-foreground text-sm">
              Something went wrong. Please try again.
            </p>
          </div>
        )}

        {!(isLoading || error) && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.Search className="mb-4 text-muted-foreground" size={32} />
            <h3 className="mb-2 font-medium text-foreground">No results</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {!(isLoading || error) &&
          results.length > 0 &&
          results.map((result) => (
            <SearchResultItem key={result.id} result={result} />
          ))}
      </div>

      {/* Load More */}
      {results.length > 0 && results.length < totalResults && (
        <div className="mt-6 text-center">
          <Button variant="outline">Load more results</Button>
        </div>
      )}
    </div>
  );
}
