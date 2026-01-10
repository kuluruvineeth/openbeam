"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type ThinkProps = {
  className?: string;
};

export function Think({ className }: ThinkProps) {
  return (
    <motion.div
      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
      className={cn("h-2 w-2 rounded-full bg-primary", className)}
      transition={{
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    />
  );
}
