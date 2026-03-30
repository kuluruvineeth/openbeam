"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../utils/cn";

type CopyInputProps = {
  value: string;
  className?: string;
};

const CopyInput = React.forwardRef<HTMLButtonElement, CopyInputProps>(
  ({ value, className }, ref) => {
    const [copied, setCopied] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(null);

    const handleCopy = React.useCallback(() => {
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
        ref={ref}
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
                <svg
                  aria-hidden="true"
                  className="text-emerald-500"
                  fill="none"
                  height={14}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  width={14}
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </motion.span>
            ) : (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                initial={{ opacity: 0, scale: 0.8 }}
                key="copy"
                transition={{ duration: 0.15 }}
              >
                <svg
                  aria-hidden="true"
                  className="text-muted-foreground"
                  fill="none"
                  height={14}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  width={14}
                >
                  <rect height={13} rx={2} ry={2} width={13} x={9} y={9} />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>
    );
  }
);
CopyInput.displayName = "CopyInput";

export { CopyInput };
export type { CopyInputProps };
