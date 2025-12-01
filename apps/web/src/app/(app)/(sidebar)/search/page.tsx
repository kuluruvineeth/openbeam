import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { SearchHeader } from "@/components/search/search-header";
import { SearchPageContent } from "@/components/search/search-page-content";
import { SearchPageSkeleton } from "@/components/search/search-skeleton";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Search | OpenPlane",
  description: "Search across all your connected apps and data sources",
};

export default async function SearchPage() {
  return (
    <HydrateClient>
      <div className="mt-4">
        <SearchHeader />
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<SearchPageSkeleton />}>
            <SearchPageContent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
