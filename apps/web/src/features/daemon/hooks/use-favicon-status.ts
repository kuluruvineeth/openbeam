"use client";

import { useEffect, useState } from "react";
import { useAggregatedAgents } from "./use-aggregated-agents";

type FaviconStatus = "none" | "running" | "attention";
type ColorScheme = "dark" | "light";

function deriveFaviconStatus(
  agents: ReturnType<typeof useAggregatedAgents>["agents"]
): FaviconStatus {
  if (agents.some((agent) => agent.status === "running")) {
    return "running";
  }
  if (agents.some((agent) => agent.requiresAttention)) {
    return "attention";
  }
  return "none";
}

function getFaviconUri(
  status: FaviconStatus,
  colorScheme: ColorScheme
): string {
  const suffix = status === "none" ? "" : `-${status}`;
  return `/assets/images/favicon-${colorScheme}${suffix}.png`;
}

function getOrCreateFaviconLink(): HTMLLinkElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  return link;
}

function updateFavicon(status: FaviconStatus, colorScheme: ColorScheme): void {
  const link = getOrCreateFaviconLink();
  if (!link) {
    return;
  }

  const newHref = getFaviconUri(status, colorScheme);
  if (link.href !== newHref) {
    link.href = newHref;
  }
}

function getSystemColorScheme(): ColorScheme {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useFaviconStatus(): void {
  const { agents } = useAggregatedAgents();
  const [colorScheme, setColorScheme] =
    useState<ColorScheme>(getSystemColorScheme);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const status = deriveFaviconStatus(agents);
    updateFavicon(status, colorScheme);
  }, [agents, colorScheme]);
}
