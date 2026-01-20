"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { cn } from "../../../../utils";

interface NodeFieldProps {
  label: string;
  value?: string | number;
  children?: ReactNode;
  mono?: boolean;
  className?: string;
}

export const NodeField = memo(function NodeFieldComponent({
  label,
  value,
  children,
  mono = false,
  className,
}: NodeFieldProps) {
  const content = children ?? value;
  if (content === undefined) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("text-xs", mono && "font-mono tabular-nums")}>
        {content}
      </span>
    </div>
  );
});

NodeField.displayName = "NodeField";
