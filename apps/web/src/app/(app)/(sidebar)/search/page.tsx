import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { SearchPage as SearchPageContent } from "@/features/search/components/search-page";
import { SearchPageSkeleton } from "@/features/search/components/search-skeleton";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Search | OpenBeam",
  description: "Search across all your connected apps and data sources",
};

export default async function SearchPage() {
  return (
    <HydrateClient>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchPageContent />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
