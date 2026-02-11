"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { SHORTCUT_GROUPS } from "../constants/commands";

const kbdVariants = cva(
  "inline-flex items-center justify-center rounded-sm border px-1.5 py-0.5 font-medium font-mono text-[10px]",
  {
    variants: {
      variant: {
        default: "border-border/50 bg-muted text-muted-foreground",
        active: "border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

type KeyboardShortcutsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate faster with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut) => (
                  <div
                    className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm"
                    key={shortcut.action}
                  >
                    <span className="text-foreground">{shortcut.action}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          className={kbdVariants({ variant: "default" })}
                          key={key}
                        >
                          {formatKeyLabel(key)}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatKeyLabel(key: string): string {
  const KEY_SYMBOLS: Record<string, string> = {
    Cmd: "\u2318",
    Shift: "\u21E7",
    Alt: "\u2325",
    Ctrl: "\u2303",
    Enter: "\u21B5",
    Esc: "\u238B",
  };
  return KEY_SYMBOLS[key] ?? key;
}

export { kbdVariants };
