"use client";

import { useSyncExternalStore } from "react";

export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactElement | null {
  const isClient = useSyncExternalStore(
    () => () => {
      // No-op subscribe function (never changes)
    },
    () => true,
    () => false
  );

  if (!isClient) {
    return fallback as React.ReactElement | null;
  }

  return children as React.ReactElement;
}
