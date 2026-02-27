"use client";

import { cn } from "@openplane/ui/utils";
import { m } from "motion/react";
import Image from "next/image";
import { useMemo } from "react";
import { buildSuggestions } from "./chat-suggestions";

interface ChatGreetingProps {
  connectors?: readonly { app: string }[] | null;
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
}

export function ChatGreeting({
  connectors,
  onSuggestionClick,
  className,
}: ChatGreetingProps) {
  const suggestions = useMemo(() => buildSuggestions(connectors), [connectors]);
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center px-4",
        className
      )}
    >
      <m.div
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative mb-6 flex h-12 w-12 items-center justify-center">
          <Image
            alt="OpenPlane"
            className="h-10 w-10 dark:hidden"
            height={40}
            src="/assets/logo.png"
            width={40}
          />
          <Image
            alt="OpenPlane"
            className="hidden h-10 w-10 dark:block"
            height={40}
            src="/assets/logo_dark.png"
            width={40}
          />
        </div>

        <h2 className="mb-2 font-medium text-foreground text-lg">
          Build your workflow
        </h2>
        <p className="mb-8 max-w-[280px] text-center text-muted-foreground text-sm">
          Describe what you want to automate and I'll help you build it
        </p>

        <div className="flex w-full max-w-sm flex-col gap-2">
          {suggestions.map((suggestion, index) => (
            <m.button
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "group flex items-center gap-3 rounded-md border border-border/50 px-4 py-3 text-left transition-colors",
                "bg-background hover:bg-muted"
              )}
              initial={{ opacity: 0, y: 10 }}
              key={suggestion.label}
              onClick={() => onSuggestionClick?.(suggestion.prompt)}
              transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
              type="button"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <suggestion.icon className="h-4 w-4" />
              </div>
              <span className="text-foreground text-sm">
                {suggestion.label}
              </span>
            </m.button>
          ))}
        </div>
      </m.div>
    </div>
  );
}
