"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface Category {
  id: string;
  name: string;
}

interface ConnectorCategoryTabsProps {
  categories: readonly Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

export function ConnectorCategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  className,
}: ConnectorCategoryTabsProps) {
  return (
    <div
      className={cn(
        "flex justify-center gap-1 border-border/40 border-b",
        className
      )}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category.id;

        return (
          <button
            className={cn(
              "relative px-4 pt-1 pb-3 font-sans text-sm transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            type="button"
          >
            {category.name}
            {isActive && (
              <motion.div
                className="absolute right-0 bottom-0 left-0 h-[2px] bg-foreground"
                layoutId="category-underline"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
