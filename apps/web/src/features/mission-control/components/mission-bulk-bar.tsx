"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Icons,
} from "@openplane/ui";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

type MissionBulkBarProps = {
  selectedCount: number;
  onDeselect: () => void;
  onPauseAll?: () => void;
  onCancelAll?: () => void;
  onDeleteAll?: () => void;
};

export function MissionBulkBar({
  selectedCount,
  onDeselect,
  onPauseAll,
  onCancelAll,
  onDeleteAll,
}: MissionBulkBarProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50"
          exit={{ y: 20, opacity: 0 }}
          initial={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <div className="flex items-center gap-3 rounded-md border border-border/50 bg-card px-4 py-2.5 shadow-sm">
            <span className="font-medium text-sm">
              {selectedCount} selected
            </span>
            <button
              className="text-muted-foreground text-xs transition-colors hover:text-foreground"
              onClick={onDeselect}
              type="button"
            >
              Deselect
            </button>
            <div className="h-4 w-px bg-border/50" />
            {onPauseAll && (
              <button
                className="flex items-center gap-1.5 rounded-sm border border-border/50 px-2.5 py-1 text-sm transition-colors hover:bg-muted/50"
                onClick={onPauseAll}
                type="button"
              >
                <Icons.Pause size={14} />
                Pause All
              </button>
            )}
            {onCancelAll && (
              <button
                className="flex items-center gap-1.5 rounded-sm border border-border/50 px-2.5 py-1 text-sm transition-colors hover:bg-muted/50"
                onClick={onCancelAll}
                type="button"
              >
                <Icons.Close size={14} />
                Cancel All
              </button>
            )}
            {onDeleteAll && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 rounded-sm border border-destructive/30 px-2.5 py-1 text-destructive text-sm transition-colors hover:bg-destructive/10"
                    type="button"
                  >
                    <Icons.Delete size={14} />
                    Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete {selectedCount} missions?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The selected missions and
                      their associated data will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteAll}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
