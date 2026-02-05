"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useDebounce } from "../../hooks/use-debounce";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";
import { Input } from "../input";

interface ParsedFilters {
  search?: string;
  status?: string[];
  dateRange?: { from: Date; to: Date };
  tags?: string[];
  type?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

interface AiFilterInputProps {
  onFiltersApplied: (filters: ParsedFilters) => void;
  onParseFilters?: (query: string) => Promise<ParsedFilters>;
  suggestions?: string[];
  onSuggestionsRequest?: (input: string) => Promise<string[]>;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

const DEFAULT_SUGGESTIONS = [
  "active items",
  "created this week",
  "failed runs",
  "most used",
];

function AiFilterInput({
  onFiltersApplied,
  onParseFilters,
  suggestions: externalSuggestions,
  onSuggestionsRequest,
  placeholder = "Try: 'active items created last week'",
  className,
  debounceMs = 300,
}: AiFilterInputProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedInput = useDebounce(input, debounceMs);

  const fetchSuggestions = useCallback(async () => {
    if (!onSuggestionsRequest || debouncedInput.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await onSuggestionsRequest(debouncedInput);
      setSuggestions(results);
    } catch {
      setSuggestions(externalSuggestions || DEFAULT_SUGGESTIONS);
    }
  }, [debouncedInput, onSuggestionsRequest, externalSuggestions]);

  const handleSubmit = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        return;
      }
      setIsProcessing(true);
      setShowSuggestions(false);

      try {
        if (onParseFilters) {
          const parsed = await onParseFilters(value);
          onFiltersApplied(parsed);
        } else {
          onFiltersApplied({ search: value });
        }
        setInput("");
        setSuggestions([]);
      } catch {
        setSuggestions(externalSuggestions || DEFAULT_SUGGESTIONS);
      } finally {
        setIsProcessing(false);
      }
    },
    [onParseFilters, onFiltersApplied, externalSuggestions]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setShowSuggestions(true);
    fetchSuggestions();
  };

  const displaySuggestions =
    suggestions.length > 0
      ? suggestions
      : externalSuggestions || DEFAULT_SUGGESTIONS;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Icons.Sparkles className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pr-20 pl-10"
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          value={input}
        />
        <div className="-translate-y-1/2 absolute top-1/2 right-2 flex items-center gap-1">
          {input && (
            <button
              className="rounded p-1 hover:bg-muted"
              onClick={() => setInput("")}
              type="button"
            >
              <Icons.X className="h-3 w-3" />
            </button>
          )}
          <Button
            disabled={!input.trim() || isProcessing}
            onClick={() => handleSubmit(input)}
            size="sm"
            variant="ghost"
          >
            {isProcessing ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showSuggestions && input && displaySuggestions.length > 0 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
          >
            {displaySuggestions.map((suggestion) => (
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                  handleSubmit(suggestion);
                }}
                type="button"
              >
                <Icons.Sparkles className="h-3 w-3 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { AiFilterInput };
export type { AiFilterInputProps, ParsedFilters };
