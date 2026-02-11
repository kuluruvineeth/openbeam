"use client";

import { Button, Icons } from "@openplane/ui";

type TabErrorFallbackProps = {
  tab: string;
  onRetry: () => void;
  error?: Error;
};

export function TabErrorFallback({ tab, onRetry }: TabErrorFallbackProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-sm border border-border/50 border-dashed">
      <div className="flex flex-col items-center gap-3">
        <Icons.AlertCircle className="text-destructive" size={20} />
        <p className="text-muted-foreground text-sm">Failed to load {tab}</p>
        <Button onClick={onRetry} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    </div>
  );
}
