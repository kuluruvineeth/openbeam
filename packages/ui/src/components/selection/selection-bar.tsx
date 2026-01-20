"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Archive, Copy, Pause, Play, Tag, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "../../utils/cn";
import { Button } from "../button";

const selectionBarVariants = cva(
  "-translate-x-1/2 fixed left-1/2 z-50 flex items-center gap-2 rounded-lg border border-border bg-background/95 px-4 py-2 shadow-sm backdrop-blur-sm",
  {
    variants: {
      position: {
        bottom: "bottom-6",
        top: "top-20",
      },
    },
    defaultVariants: {
      position: "bottom",
    },
  }
);

interface SelectionAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface SelectionBarProps extends VariantProps<typeof selectionBarVariants> {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onTag?: () => void;
  onDuplicate?: () => void;
  onRun?: () => void;
  onPause?: () => void;
  customActions?: SelectionAction[];
  className?: string;
}

export function SelectionBar({
  count,
  onClear,
  onDelete,
  onArchive,
  onTag,
  onDuplicate,
  onRun,
  onPause,
  customActions = [],
  position,
  className,
}: SelectionBarProps) {
  const isVisible = count > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className={cn(selectionBarVariants({ position }), className)}
          exit={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          initial={{ y: position === "top" ? -100 : 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        >
          <div className="flex items-center gap-3 border-border border-r pr-3">
            <span className="font-medium text-sm tabular-nums">
              {count} selected
            </span>
            <button
              className="rounded p-1 transition-colors hover:bg-muted"
              onClick={onClear}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {onRun && (
              <Button onClick={onRun} size="sm" variant="ghost">
                <Play className="mr-1 h-4 w-4" />
                Run
              </Button>
            )}

            {onPause && (
              <Button onClick={onPause} size="sm" variant="ghost">
                <Pause className="mr-1 h-4 w-4" />
                Pause
              </Button>
            )}

            {onDuplicate && (
              <Button onClick={onDuplicate} size="sm" variant="ghost">
                <Copy className="mr-1 h-4 w-4" />
                Duplicate
              </Button>
            )}

            {onTag && (
              <Button onClick={onTag} size="sm" variant="ghost">
                <Tag className="mr-1 h-4 w-4" />
                Tag
              </Button>
            )}

            {onArchive && (
              <Button onClick={onArchive} size="sm" variant="ghost">
                <Archive className="mr-1 h-4 w-4" />
                Archive
              </Button>
            )}

            {customActions.map((action) => (
              <Button
                disabled={action.disabled}
                key={action.label}
                onClick={action.onClick}
                size="sm"
                variant={
                  action.variant === "destructive" ? "destructive" : "ghost"
                }
              >
                {action.icon}
                <span className="ml-1">{action.label}</span>
              </Button>
            ))}

            {onDelete && (
              <Button
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { selectionBarVariants };
export type { SelectionAction, SelectionBarProps };
