"use client";

import { Textarea } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useState } from "react";

const modeToggleVariants = cva(
  "rounded-sm px-2 py-0.5 font-medium text-[10px] transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted/50",
      },
    },
    defaultVariants: { active: false },
  }
);

const CHAR_LIMIT = 5000;

type SoulPromptEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SoulPromptEditor({ value, onChange }: SoulPromptEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground text-xs">
          Soul Prompt
        </span>
        <div className="flex gap-0.5 rounded-sm border border-border/50 p-0.5">
          <button
            className={modeToggleVariants({ active: mode === "edit" })}
            onClick={() => setMode("edit")}
            type="button"
          >
            Edit
          </button>
          <button
            className={modeToggleVariants({ active: mode === "preview" })}
            onClick={() => setMode("preview")}
            type="button"
          >
            Preview
          </button>
        </div>
      </div>

      {mode === "edit" ? (
        <Textarea
          className="min-h-[100px] resize-none font-mono text-xs"
          maxLength={CHAR_LIMIT}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Define the agent's personality, expertise, and behavioral guidelines..."
          value={value}
        />
      ) : (
        <div className="min-h-[100px] whitespace-pre-wrap rounded-md border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs">
          {value || (
            <span className="text-muted-foreground">No prompt defined</span>
          )}
        </div>
      )}

      <span className="self-end text-[10px] text-muted-foreground tabular-nums">
        {value.length}/{CHAR_LIMIT}
      </span>
    </div>
  );
}

export { modeToggleVariants };
