"use client";

import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useTriggerSync } from "@/hooks/use-sync";

type BulkActionsToolbarProps = {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
};

export function BulkActionsToolbar({
  selectedCount,
  selectedIds,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const triggerSync = useTriggerSync({
    onSuccess: () => {
      toast.success("Bulk sync started");
      onClearSelection();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Bulk sync failed: ${message}`);
    },
  });

  const handleBulkSync = () => {
    for (const id of selectedIds) {
      triggerSync.mutate({ connectorId: id, type: "FULL" });
    }
  };

  return (
    <div className="flex items-center justify-between border border-border bg-background-50 p-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{selectedCount} selected</span>
        <Button onClick={onClearSelection} size="sm" variant="ghost">
          Clear
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          disabled={triggerSync.isPending}
          onClick={handleBulkSync}
          size="sm"
          variant="outline"
        >
          <Icons.Sparkle className="mr-2" size={14} />
          Sync All
        </Button>
      </div>
    </div>
  );
}
