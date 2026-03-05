"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface ConnectorSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ConnectorSearch({
  value,
  onChange,
  className,
}: ConnectorSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={cn("relative mx-auto max-w-md", className)}>
      <svg
        aria-hidden="true"
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 text-muted-foreground"
        fill="none"
        role="img"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <title>Search</title>
        <circle cx={11} cy={11} r={8} />
        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
      </svg>
      <input
        className="h-10 w-full border border-border/60 bg-background pr-16 pl-10 font-sans text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/30"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search connectors..."
        ref={inputRef}
        type="text"
        value={value}
      />
      <kbd className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 select-none border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </div>
  );
}
