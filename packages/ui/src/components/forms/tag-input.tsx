"use client";

import { X } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";

import { cn } from "../../utils/cn";
import { Badge } from "../badge";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
  className?: string;
}

function TagInput({
  value,
  onChange,
  placeholder = "Add tag...",
  maxTags = 10,
  suggestions = [],
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed) && value.length < maxTags) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      const lastTag = value.at(-1);
      if (lastTag) {
        removeTag(lastTag);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <label
        className={cn(
          "flex cursor-text flex-wrap items-center gap-1.5 p-2",
          "rounded-md border border-border",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        )}
      >
        {value.map((tag) => (
          <Badge className="gap-1 pr-1" key={tag} variant="secondary">
            {tag}
            <button
              className="rounded p-0.5 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          className={cn(
            "min-w-[120px] flex-1 bg-transparent text-sm outline-none",
            "placeholder:text-muted-foreground"
          )}
          disabled={value.length >= maxTags}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          ref={inputRef}
          value={inputValue}
        />
      </label>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {filteredSuggestions.slice(0, 5).map((suggestion) => (
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              key={suggestion}
              onClick={() => addTag(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {maxTags && (
        <p className="mt-1 text-muted-foreground text-xs">
          {value.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}

export { TagInput };
export type { TagInputProps };
