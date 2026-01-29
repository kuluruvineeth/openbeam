"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../utils";

const selectionCardVariants = cva(
  "flex cursor-pointer items-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      selected: {
        true: "border-primary bg-primary/5",
        false: "border-border/50 hover:border-border hover:bg-muted/50",
      },
      layout: {
        horizontal: "flex-row gap-3",
        vertical: "flex-col gap-2 text-center",
      },
      size: {
        default: "rounded-md border px-3 py-2",
        sm: "rounded-md border px-2 py-1.5",
        lg: "rounded-md border px-4 py-3",
      },
    },
    defaultVariants: {
      selected: false,
      layout: "horizontal",
      size: "default",
    },
  }
);

export interface SelectionCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof selectionCardVariants> {
  icon?: ReactNode;
  label: string;
  description?: string;
}

export const SelectionCard = forwardRef<HTMLButtonElement, SelectionCardProps>(
  function SelectionCardComponent(
    { className, selected, layout, size, icon, label, description, ...props },
    ref
  ) {
    return (
      <button
        aria-pressed={selected ?? false}
        className={cn(
          selectionCardVariants({ selected, layout, size }),
          className
        )}
        ref={ref}
        type="button"
        {...props}
      >
        {icon && (
          <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
        )}
        <span className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{label}</span>
          {description && (
            <span className="text-muted-foreground text-xs">{description}</span>
          )}
        </span>
      </button>
    );
  }
);

SelectionCard.displayName = "SelectionCard";

export { selectionCardVariants };
