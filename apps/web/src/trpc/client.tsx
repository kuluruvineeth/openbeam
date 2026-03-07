"use client";

import type { AppRouter } from "@openbeam/api/routers/index";
import { isServer, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createTRPCClient,
  httpBatchLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
  type TRPCClient,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";
import { publicServerUrl, trpcSubscriptionUrl, trpcUrl } from "@/lib/urls";
import { makeQueryClient } from "@/trpc/query-client";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

let browserQueryClient: ReturnType<typeof makeQueryClient> | undefined;
let vanillaClient: TRPCClient<AppRouter> | undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

async function getSSRHeaders(): Promise<Record<string, string>> {
  if (!isServer) {
    return {};
  }
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const cookie = headersList.get("cookie");
  return cookie ? { cookie } : {};
}

function createVanillaClient(): TRPCClient<AppRouter> {
  return createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      splitLink({
        condition: (op) => op.type === "subscription",
        true: httpSubscriptionLink({
          url: trpcSubscriptionUrl,
          transformer: superjson,
          eventSourceOptions: () => ({
            withCredentials: true,
          }),
        }),
        false: httpBatchLink({
          url: isServer
            ? `${process.env.SERVER_INTERNAL_URL || publicServerUrl}/trpc`
            : trpcUrl,
          transformer: superjson,
          headers: getSSRHeaders,
          fetch: (url, opts) => fetch(url, { ...opts, credentials: "include" }),
        }),
      }),
    ],
  });
}

export function getVanillaTRPCClient(): TRPCClient<AppRouter> {
  if (isServer) {
    return createVanillaClient();
  }
  if (!vanillaClient) {
    vanillaClient = createVanillaClient();
  }
  return vanillaClient;
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const trpcClient = getVanillaTRPCClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        {props.children}
        <ReactQueryDevtools />
      </TRPCProvider>
    </QueryClientProvider>
  );
}
