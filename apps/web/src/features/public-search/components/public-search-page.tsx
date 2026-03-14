"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import {
  SearchEmptyState,
  SearchInputBar,
  SearchResults,
  SearchResultsSkeleton,
} from "@/features/search";
import type {
  SearchResultDocument,
  UnifiedSearchItem,
} from "@/features/search/types";
import { usePublicSearch } from "../hooks/use-public-search";
import { usePublicSearchNav } from "../hooks/use-public-search-nav";
import { toSearchResultDocument } from "../lib/api";
import { EXPLORE_CARDS } from "../lib/constants";
import { ExploreBanner } from "./explore-banner";
import { PublicSearchSourcesPanel } from "./public-search-sources-panel";
import { ThemeToggle } from "./theme-toggle";

const EASE = [0.16, 1, 0.3, 1] as const;

function DotGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}

function ExploreCard({
  card,
  index,
  onClick,
}: {
  card: (typeof EXPLORE_CARDS)[number];
  index: number;
  onClick: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  return (
    <motion.button
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      className="group relative overflow-hidden border border-border/40 bg-card p-5 text-left transition-colors duration-200 hover:border-border"
      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.06, ease: EASE }}
      type="button"
    >
      {isHovering && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--foreground) / 0.04), transparent 70%)`,
          }}
        />
      )}

      <div className="relative">
        <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
          {card.id}
        </span>
        <p className="mt-1.5 text-[14px] text-foreground leading-snug">
          {card.title}
        </p>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground/50 tracking-wide">
          {card.meta}
        </p>
      </div>

      <Icons.ArrowRight
        className="absolute right-4 bottom-4 text-transparent transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/50"
        size={12}
      />
    </motion.button>
  );
}

function ExploreLanding({
  query,
  isFetching,
  onQueryChange,
  onSuggestionClick,
}: {
  query: string;
  isFetching: boolean;
  onQueryChange: (q: string) => void;
  onSuggestionClick: (q: string) => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <DotGrid />

      <div className="pointer-events-none absolute top-3 right-4 z-20">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      <ExploreBanner />

      <div className="relative flex w-full max-w-[680px] flex-1 flex-col justify-center self-center px-6">
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5 }}
        >
          <Icons.LogoSmall className="h-10 w-auto" />
        </motion.div>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center font-serif text-[48px] text-foreground leading-none tracking-tight sm:text-[64px]"
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        >
          OpenBeam
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-center text-muted-foreground text-sm leading-relaxed tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
        >
          Search vulnerabilities, techniques, and security guides
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 border border-border bg-background"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
        >
          <SearchInputBar
            isSearching={isFetching}
            onChange={onQueryChange}
            placeholder="log4shell, SQL injection, T1190..."
            value={query}
          />
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXPLORE_CARDS.map((card, index) => (
            <ExploreCard
              card={card}
              index={index}
              key={card.query}
              onClick={() => onSuggestionClick(card.query)}
            />
          ))}
        </div>

        <motion.p
          animate={{ opacity: 1 }}
          className="mt-12 text-center font-mono text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em]"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          NVD &middot; MITRE ATT&CK &middot; OWASP &middot; CISA KEV
        </motion.p>
      </div>
    </div>
  );
}

export function PublicSearchPage() {
  const {
    query,
    setQuery,
    hasQuery,
    hits,
    total,
    facets,
    timing,
    isLoading,
    isFetching,
    dataset,
    setDataset,
  } = usePublicSearch();

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const unifiedItems: UnifiedSearchItem[] = useMemo(
    () =>
      hits.map((hit) => ({
        type: "document" as const,
        data: toSearchResultDocument(hit),
        relevance: hit.relevance,
      })),
    [hits]
  );

  const hasResults = unifiedItems.length > 0;
  const isEmpty = hasQuery && !isLoading && !hasResults;

  usePublicSearchNav({
    hits,
    selectedIndex,
    setSelectedIndex,
    enabled: hasResults,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on query/dataset change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, dataset]);

  useHotkeys("escape", () => {
    if (hasQuery) {
      setQuery("");
    }
  });

  const handleSuggestionClick = useCallback(
    (q: string) => {
      setQuery(q);
    },
    [setQuery]
  );

  const handleSelectDocument = useCallback(
    (_: SearchResultDocument, index: number) => setSelectedIndex(index),
    []
  );

  const noop = useCallback(Function.prototype as () => void, []);

  if (!hasQuery) {
    return (
      <ExploreLanding
        isFetching={isFetching}
        onQueryChange={setQuery}
        onSuggestionClick={handleSuggestionClick}
        query={query}
      />
    );
  }

  return (
    <div className="flex h-full">
      <main className="min-w-0 flex-1">
        <div className="flex h-full flex-col">
          <header className="sticky top-0 z-10 shrink-0 bg-background">
            <div className="border border-border/50 bg-background">
              <SearchInputBar
                isSearching={isFetching}
                onChange={setQuery}
                value={query}
              />
            </div>
            {timing && (
              <div className="px-3 py-1.5">
                <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                  {total.toLocaleString()} results in {timing.totalMs}ms
                </span>
              </div>
            )}
          </header>

          <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
            {isLoading && !hasResults && <SearchResultsSkeleton />}
            {isEmpty && <SearchEmptyState query={query} />}
            {hasResults && (
              <SearchResults
                fetchNextPage={noop}
                hasNextPage={false}
                isFetchingNextPage={false}
                items={unifiedItems}
                onSelectDocument={handleSelectDocument}
                previewId={null}
                selectedIndex={selectedIndex}
              />
            )}
          </section>
        </div>
      </main>

      {hasQuery && (
        <PublicSearchSourcesPanel
          activeDataset={dataset}
          facets={facets}
          isLoading={isLoading}
          onDatasetChange={setDataset}
        />
      )}
    </div>
  );
}
