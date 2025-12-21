"use client";

import { forwardRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  setQuery: (query: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  className?: string;
};

export const ChatInput = forwardRef<HTMLDivElement, Props>(
  (
    {
      query,
      setQuery,
      placeholder = "Ask a question or type @ to search your apps",
      onKeyDown,
      onPaste,
      className,
    },
    ref
  ) => {
    const [isPlaceholderVisible, setIsPlaceholderVisible] = useState(true);

    useEffect(() => {
      setIsPlaceholderVisible(query.length === 0);
    }, [query]);

    const adjustHeight = useCallback(() => {
      if (ref && typeof ref !== "function" && ref.current) {
        ref.current.style.height = "auto";
        const scrollHeight = ref.current.scrollHeight;
        const minHeight = 52;
        const maxHeight = 320;
        const newHeight = Math.max(
          minHeight,
          Math.min(scrollHeight, maxHeight)
        );
        ref.current.style.height = `${newHeight}px`;
      }
    }, [ref]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally adjust height when query prop changes
    useEffect(() => {
      adjustHeight();
    }, [query, adjustHeight]);

    return (
      <div className="relative flex items-center">
        {isPlaceholderVisible && (
          <div className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 text-muted-foreground">
            {placeholder}
          </div>
        )}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions lint/a11y/noStaticElementInteractions: contentEditable div is interactive */}
        <div
          className={cn(
            "grow resize-none overflow-y-auto bg-transparent pt-[14px] pr-4 pb-[14px] pl-4 font-[450] text-[15px] text-foreground leading-[24px] outline-none placeholder:text-muted-foreground",
            className
          )}
          contentEditable
          onInput={(e) => {
            const newValue = (e.currentTarget.textContent || "").trim();
            setQuery(newValue);
            setIsPlaceholderVisible(newValue.length === 0);
            adjustHeight();
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          ref={ref}
          style={{
            minHeight: "52px",
            maxHeight: "320px",
          }}
        />
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
