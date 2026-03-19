"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

const LOADERS = [
  "spatial-loader-1",
  "spatial-loader-2",
  "spatial-loader-3",
  "spatial-loader-4",
  "spatial-loader-5",
];

interface SceneLoaderProps {
  className?: string;
  fullScreen?: boolean;
}

export function SceneLoader({
  className,
  fullScreen = false,
}: SceneLoaderProps) {
  const [loaderClass, setLoaderClass] = useState<string | null>(null);

  useEffect(() => {
    setLoaderClass(
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      LOADERS[Math.floor(Math.random() * LOADERS.length)] ?? LOADERS[0]!
    );
  }, []);

  if (!loaderClass) {
    return null;
  }

  return (
    <div
      className={cn(
        "z-100 flex items-center justify-center bg-[#242422]/90 transition-opacity duration-300",
        fullScreen ? "fixed inset-0" : "absolute inset-0",
        className
      )}
    >
      <div className={cn(loaderClass, "text-[#ccc9c0] opacity-80")} />
    </div>
  );
}
