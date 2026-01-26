"use client";

import { forwardRef, memo, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/dialog";
import { cn } from "../../utils";
import { Icons } from "../icons";
import {
  CANVAS_KEYBOARD_SHORTCUTS,
  type CanvasShortcut,
} from "./use-canvas-keyboard";

function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/60 bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}

function ShortcutRow({ shortcut }: { shortcut: CanvasShortcut }) {
  const keys = shortcut.key.split("");
  const isMacMod = keys.includes("⌘");
  const isShift = keys.includes("⇧");

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-foreground text-sm">{shortcut.description}</span>
      <div className="flex items-center gap-0.5">
        {isMacMod && <Kbd>⌘</Kbd>}
        {isShift && <Kbd>⇧</Kbd>}
        <Kbd>
          {shortcut.key.replace("⌘", "").replace("⇧", "").replace("↵", "⏎")}
        </Kbd>
      </div>
    </div>
  );
}

export interface KeyboardShortcutsPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export const KeyboardShortcutsPanel = memo(
  forwardRef<HTMLDivElement, KeyboardShortcutsPanelProps>(
    function KeyboardShortcutsPanelComponent(
      { open, onOpenChange, trigger, className },
      ref
    ) {
      const groupedShortcuts = useMemo(() => {
        const groups: Record<string, CanvasShortcut[]> = {};
        for (const shortcut of CANVAS_KEYBOARD_SHORTCUTS) {
          const category = shortcut.category;
          if (!groups[category]) {
            groups[category] = [];
          }
          groups[category]?.push(shortcut);
        }
        return groups;
      }, []);

      const categoryOrder = ["Tools", "Edit", "View", "Actions"];

      return (
        <Dialog onOpenChange={onOpenChange} open={open}>
          {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
          <DialogContent className={cn("max-w-md", className)} ref={ref}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icons.Keyboard size={16} />
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription>
                Speed up your workflow with these shortcuts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {categoryOrder.map((category) => {
                const shortcuts = groupedShortcuts[category];
                if (!shortcuts || shortcuts.length === 0) {
                  return null;
                }

                return (
                  <div key={category}>
                    <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      {category}
                    </h4>
                    <div className="divide-y divide-border/50">
                      {shortcuts.map((shortcut) => (
                        <ShortcutRow key={shortcut.key} shortcut={shortcut} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      );
    }
  )
);

KeyboardShortcutsPanel.displayName = "KeyboardShortcutsPanel";
