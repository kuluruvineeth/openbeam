"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { memo } from "react";
import { cn } from "../../../utils";

const selectionButtonVariants = cva("rounded-md border transition-colors", {
  variants: {
    selected: {
      true: "border-primary bg-primary/5",
      false: "border-border/50 hover:border-border hover:bg-muted/50",
    },
  },
  defaultVariants: {
    selected: false,
  },
});

interface SelectionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof selectionButtonVariants> {}

const SelectionButton = memo(function SelectionButtonComponent({
  selected,
  className,
  disabled,
  ...props
}: SelectionButtonProps) {
  return (
    <button
      className={cn(
        selectionButtonVariants({ selected }),
        disabled && "pointer-events-none opacity-50",
        className
      )}
      disabled={disabled}
      type="button"
      {...props}
    />
  );
});

SelectionButton.displayName = "SelectionButton";

export { SelectionButton, selectionButtonVariants };
