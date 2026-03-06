"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const ACCENT_COLORS = {
  default: "",
  blue: "border-l-2 border-l-[#2563EB]",
  teal: "border-l-2 border-l-[#0D9488]",
  amber: "border-l-2 border-l-[#D97706]",
  green: "border-l-2 border-l-[#059669]",
} as const;

type Accent = keyof typeof ACCENT_COLORS;

interface PitchCardProps {
  children: ReactNode;
  className?: string;
  accent?: Accent;
}

export function PitchCard({
  children,
  className,
  accent = "default",
}: PitchCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card px-6 pt-8 pb-6",
        ACCENT_COLORS[accent],
        className
      )}
    >
      {children}
    </div>
  );
}
