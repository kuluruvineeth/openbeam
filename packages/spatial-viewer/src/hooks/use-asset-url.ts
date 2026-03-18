import { loadAssetUrl } from "@openbeam/spatial-core";
import { useEffect, useState } from "react";

export function useAssetUrl(url: string): string | null {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    loadAssetUrl(url).then((result) => {
      if (!cancelled) {
        setResolved(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolved;
}
