"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type CopyInputProps = {
  value: string;
  className?: string;
};

export function CopyInput({ value, className }: CopyInputProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      className={cn(
        "relative flex w-full items-center border border-border/50 bg-background px-3 py-2 pr-10 text-left transition-colors hover:bg-muted/50",
        "rounded-sm",
        className
      )}
      onClick={handleCopy}
      type="button"
    >
      <span className="truncate font-mono text-muted-foreground text-sm">
        {value}
      </span>
      <span className="-translate-y-1/2 absolute top-1/2 right-3">
        <AnimatePresence initial={false} mode="wait">
          {copied ? (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              initial={{ opacity: 0, scale: 0.8 }}
              key="check"
              transition={{ duration: 0.15 }}
            >
              <Icons.Check className="text-emerald-500" size={14} />
            </motion.span>
          ) : (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              initial={{ opacity: 0, scale: 0.8 }}
              key="copy"
              transition={{ duration: 0.15 }}
            >
              <Icons.Copy className="text-muted-foreground" size={14} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}
