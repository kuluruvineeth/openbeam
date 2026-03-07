import type { AppRouter } from "@openbeam/api/routers/index";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function createTRPCMobileClient(baseUrl: string) {
  return createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        enabled: (opts) =>
          // biome-ignore lint/correctness/noUndeclaredVariables: necessary for this context
          __DEV__ ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        transformer: superjson,
        headers: () => ({
          "x-client": "mobile",
        }),
      }),
    ],
  });
}
