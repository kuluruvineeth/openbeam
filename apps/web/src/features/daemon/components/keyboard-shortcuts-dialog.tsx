"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openbeam/ui/components/dialog";
import { useMemo } from "react";
import { formatShortcut, type ShortcutKey } from "../lib/format-shortcut";
import { useKeyboardShortcutsStore } from "../stores/keyboard-shortcuts-store";

interface ShortcutEntry {
  label: string;
  keys: ShortcutKey[];
}

interface ShortcutSection {
  title: string;
  entries: ShortcutEntry[];
}

function buildSections(): ShortcutSection[] {
  return [
    {
      title: "Navigation",
      entries: [
        { label: "Command palette", keys: ["mod", "K"] },
        { label: "Toggle sidebar", keys: ["mod", "B"] },
        { label: "Toggle file explorer", keys: ["mod", "E"] },
        { label: "New agent", keys: ["mod", "alt", "N"] },
        { label: "Switch agent (1-9)", keys: ["mod", "1"] },
      ],
    },
    {
      title: "General",
      entries: [{ label: "Show keyboard shortcuts", keys: ["mod", "?"] }],
    },
  ];
}

function ShortcutRow({ entry }: { entry: ShortcutEntry }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-foreground text-sm">{entry.label}</span>
      <span className="text-muted-foreground text-xs">
        {formatShortcut(entry.keys)}
      </span>
    </div>
  );
}

export function KeyboardShortcutsDialog() {
  const open = useKeyboardShortcutsStore((s) => s.shortcutsDialogOpen);
  const setOpen = useKeyboardShortcutsStore((s) => s.setShortcutsDialogOpen);

  const sections = useMemo(buildSections, []);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="divide-y divide-border/40">
                {section.entries.map((entry) => (
                  <ShortcutRow entry={entry} key={entry.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
