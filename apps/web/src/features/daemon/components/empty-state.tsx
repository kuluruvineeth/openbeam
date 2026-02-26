"use client";

import { Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";

export function DaemonEmptyState({ onNewAgent }: { onNewAgent: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-medium text-foreground text-lg">No agents yet</h2>
        <p className="max-w-sm text-muted-foreground text-sm">
          Start a new coding agent to begin working on your project.
        </p>
      </div>
      <Button onClick={onNewAgent} size="sm">
        <Icons.Plus className="mr-1.5 size-4" />
        New agent
      </Button>
    </div>
  );
}
