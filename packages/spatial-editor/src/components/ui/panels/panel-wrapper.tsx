"use client";

import { Icons } from "@openbeam/ui";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 28 };

interface PanelWrapperProps {
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  onReset?: () => void;
  children: React.ReactNode;
  className?: string;
  width?: number | string;
}

export function PanelWrapper({
  title,
  icon,
  onClose,
  onReset,
  children,
  className,
  width = 320,
}: PanelWrapperProps) {
  return (
    <motion.div
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={cn(
        "pointer-events-auto fixed top-20 right-4 z-50 flex max-h-[calc(100dvh-100px)] flex-col overflow-hidden",
        "rounded-[20px] border border-[#3b3b36] bg-[#242422] shadow-[0_8px_28px_rgba(0,0,0,0.35),0_1px_6px_rgba(0,0,0,0.25)]",
        "text-[#ccc9c0]",
        className
      )}
      exit={{ opacity: 0, x: 20, scale: 0.96 }}
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      style={{ width }}
      transition={SPRING}
    >
      <div className="flex items-center justify-between border-[#3b3b36] border-b px-3 py-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex shrink-0 items-center justify-center text-[#76766e]">
              {icon}
            </span>
          )}
          <h2 className="truncate font-semibold text-[#ccc9c0] text-sm tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {onReset && (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#353530] text-[#76766e] transition-colors hover:bg-[#42423d] hover:text-[#ccc9c0]"
              onClick={onReset}
              type="button"
            >
              <Icons.RefreshCw size={16} />
            </button>
          )}
          {onClose && (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#353530] text-[#76766e] transition-colors hover:bg-[#42423d] hover:text-[#ccc9c0]"
              onClick={onClose}
              type="button"
            >
              <Icons.Close size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </motion.div>
  );
}
