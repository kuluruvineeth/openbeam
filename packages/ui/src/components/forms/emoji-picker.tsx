"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";

import { cn } from "../../utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../dropdown-menu";

interface EmojiSelectEvent {
  id: string;
  keywords: string[];
  name: string;
  native: string;
  shortcodes: string;
  unified: string;
}

interface EmojiPickerProps {
  children: React.ReactNode;
  onSelect: (emoji: string) => void;
  asChild?: boolean;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

function EmojiPicker({
  children,
  onSelect,
  asChild,
  className,
  side,
  align,
}: EmojiPickerProps) {
  const { theme, systemTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const emojiTheme = useMemo(() => {
    switch (theme) {
      case "dark":
        return "dark";
      case "light":
        return "light";
      case "system":
        return systemTheme;
      default:
        return "dark";
    }
  }, [theme, systemTheme]);

  return (
    <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        asChild={asChild}
        className={cn(
          "rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} asChild side={side}>
        <div className="z-50">
          <Picker
            data={data}
            emojiButtonSize={32}
            emojiSize={20}
            onEmojiSelect={(e: EmojiSelectEvent) => {
              onSelect(e.native);
              setOpen(false);
            }}
            theme={emojiTheme}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { EmojiPicker };
export type { EmojiPickerProps };
