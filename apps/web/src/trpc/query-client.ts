import {
  defaultShouldDehydrateQuery,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import superjson from "superjson";
// Shared QueryClient factory for both client and server.
// Keeps React Query config in one place.
export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        console.error(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
