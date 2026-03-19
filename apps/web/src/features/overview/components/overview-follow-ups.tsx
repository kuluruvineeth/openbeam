"use client";

import { motion } from "motion/react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type OverviewFollowUpsProps = {
  questions: string[];
  onSelect: (question: string) => void;
  className?: string;
};

export function OverviewFollowUps({
  questions,
  onSelect,
  className,
}: OverviewFollowUpsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-wrap gap-2", className)}
      initial={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {questions.map((question, index) => (
        <motion.button
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 rounded-sm border border-border/50 px-3 py-1.5 text-foreground/80 text-xs transition-colors hover:border-border hover:bg-accent/50"
          initial={{ opacity: 0, y: 4 }}
          key={question}
          onClick={() => onSelect(question)}
          transition={{ duration: 0.15, delay: index * 0.05 }}
          type="button"
        >
          <Icons.ArrowRight
            className="shrink-0 text-muted-foreground"
            size={10}
          />
          <span className="truncate">{question}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
