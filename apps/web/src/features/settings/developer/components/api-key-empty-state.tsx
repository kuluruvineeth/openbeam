"use client";

import { Button } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { useApiKeyModal } from "../hooks/use-api-key-modal";

export function ApiKeyEmptyState() {
  const { open } = useApiKeyModal();

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="flex size-10 items-center justify-center rounded-md border border-border/50 bg-muted/50">
        <Icons.LockIcon className="text-muted-foreground" size={20} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="font-medium text-sm">No API keys</p>
        <p className="max-w-[280px] text-center text-muted-foreground text-xs">
          Create an API key to connect MCP clients and external integrations.
        </p>
      </div>
      <Button
        className="mt-1"
        onClick={() => open("create")}
        size="sm"
        variant="outline"
      >
        <Icons.Plus size={14} />
        Create API Key
      </Button>
    </div>
  );
}
