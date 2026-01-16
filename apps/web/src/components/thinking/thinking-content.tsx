"use client";

import { TextShimmer } from "@openplane/ui";
import { memo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ThinkingContentProps = {
  content: string;
  isActive: boolean;
  className?: string;
};

function ThinkingContentInner({
  content,
  isActive,
  className,
}: ThinkingContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isActive]);

  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        "max-h-48 overflow-y-auto rounded-sm bg-muted/30 p-3 text-muted-foreground text-xs leading-relaxed",
        isActive && "border-primary/30 border-l-2",
        className
      )}
      ref={scrollRef}
    >
      {isActive ? (
        <TextShimmer as="span" className="text-xs" duration={2}>
          {content}
        </TextShimmer>
      ) : (
        <span className="whitespace-pre-wrap">{content}</span>
      )}
    </div>
  );
}

export const ThinkingContent = memo(ThinkingContentInner);
ThinkingContent.displayName = "ThinkingContent";
