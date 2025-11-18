"use client";

import { useSyncExternalStore } from "react";

export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isClient = useSyncExternalStore(
    () => () => {
      // No-op subscribe function (never changes)
    },
    () => true,
    () => false
  );

  return isClient ? children : fallback;
}
