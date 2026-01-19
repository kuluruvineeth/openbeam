"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { cn } from "../../../../utils";

interface NodeSectionProps {
  children: ReactNode;
  className?: string;
}

export const NodeSection = memo(function NodeSectionComponent({
  children,
  className,
}: NodeSectionProps) {
  return (
    <div className={cn("border-border/50 border-t px-3 py-2.5", className)}>
      {children}
    </div>
  );
});

NodeSection.displayName = "NodeSection";
