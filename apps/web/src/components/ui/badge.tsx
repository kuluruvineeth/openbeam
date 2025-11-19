import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline:
          "rounded-none border border-border bg-transparent font-mono font-normal text-[10px] text-primary",
        tag: "rounded-none border-none bg-[#F2F1EF] font-mono font-normal text-[#878787] text-[10px] dark:bg-[#1D1D1D]",
        "tag-rounded":
          "border-none bg-[#F2F1EF] px-3 py-1 font-mono font-normal text-[#878787] text-[12px] dark:bg-[#1D1D1D]",
        "tag-outline":
          "border-transparent bg-zinc-700 text-zinc-200 hover:bg-zinc-700/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
