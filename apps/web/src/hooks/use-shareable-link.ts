"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useShareableLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const generateLink = useCallback(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const url = new URL(pathname, window.location.origin);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }, [pathname, searchParams]);

  const copyToClipboard = useCallback(async () => {
    const link = generateLink();
    await navigator.clipboard.writeText(link);
    return link;
  }, [generateLink]);

  const hasParams = searchParams.size > 0;

  return { generateLink, copyToClipboard, hasParams };
}
