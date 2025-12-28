import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
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
        tag: "rounded-none border-none bg-secondary font-mono font-normal text-[10px] text-muted-foreground",
        "tag-rounded":
          "border-none bg-secondary px-3 py-1 font-mono font-normal text-[12px] text-muted-foreground",
        "tag-outline":
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        filter:
          "border-transparent bg-foreground/5 font-normal text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      className={cn(badgeVariants({ variant }), className)}
      ref={ref}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
export type { BadgeProps };
