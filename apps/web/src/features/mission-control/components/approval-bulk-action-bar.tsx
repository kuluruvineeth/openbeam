"use client";

import { Icons } from "@openplane/ui";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

type ApprovalBulkActionBarProps = {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClear: () => void;
};

export function ApprovalBulkActionBar({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onClear,
}: ApprovalBulkActionBarProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-md border border-border/50 bg-background px-4 py-2 shadow-sm"
          exit={{ opacity: 0, y: 8 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <span className="font-medium text-sm">{selectedCount} selected</span>
          <div className="h-4 w-px bg-border/50" />
          <button
            className="flex items-center gap-1.5 rounded-sm border border-border/50 px-2.5 py-1 text-sm transition-colors hover:bg-muted/50"
            onClick={onRejectAll}
            type="button"
          >
            <Icons.Close size={14} />
            Reject All
          </button>
          <button
            className="flex items-center gap-1.5 rounded-sm bg-primary px-2.5 py-1 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            onClick={onApproveAll}
            type="button"
          >
            <Icons.Check size={14} />
            Approve All
          </button>
          <button
            className="flex items-center gap-1 rounded-sm px-1.5 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
