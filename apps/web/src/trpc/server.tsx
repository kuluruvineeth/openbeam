import "server-only";

import type { AppRouter } from "@openplane/api/routers/index";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import {
  createTRPCOptionsProxy,
  type TRPCQueryOptions,
} from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";

// Stable per-request QueryClient (server only)
export const getQueryClient = cache(makeQueryClient);

// Server-side tRPC client that forwards user cookies to the API server
const createServerClient = () =>
  createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_SERVER_URL}/trpc`,
        transformer: superjson,
        async headers() {
          const headersList = await headers();
          const cookie = headersList.get("cookie");

          const forwardedHeaders: Record<string, string> = {};

          if (cookie) {
            forwardedHeaders.cookie = cookie;
          }

          return forwardedHeaders;
        },
      }),
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
    ],
  });

export const trpc = createTRPCOptionsProxy<AppRouter>({
  queryClient: getQueryClient,
  // Pass the TRPC client instance, not the factory function
  client: createServerClient(),
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: Helper should work with any TRPC query options shape.
export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T
) {
  const queryClient = getQueryClient();

  if (queryOptions.queryKey[1]?.type === "infinite") {
    // biome-ignore lint/suspicious/noExplicitAny: Helper should work with any TRPC query options shape.
    queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: Helper should work with any TRPC query options shape.
    queryClient.prefetchQuery(queryOptions as any);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Helper should work with any TRPC query options shape.
export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptionsArray: T[]
) {
  const queryClient = getQueryClient();

  for (const queryOptions of queryOptionsArray) {
    if (queryOptions.queryKey[1]?.type === "infinite") {
      // biome-ignore lint/suspicious/noExplicitAny: Helper should work with any TRPC query options shape.
      queryClient.prefetchInfiniteQuery(queryOptions as any);
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: Helper should work with any TRPC query options shape.
      queryClient.prefetchQuery(queryOptions as any);
    }
  }
}
