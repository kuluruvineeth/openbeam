"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";
import { ScrollArea } from "../scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../sheet";

const agentPanelVariants = cva("flex flex-col", {
  variants: {
    size: {
      sm: "sm:max-w-sm",
      md: "sm:max-w-md",
      lg: "sm:max-w-lg",
      xl: "sm:max-w-xl",
      full: "w-full sm:max-w-full",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type AgentPanelProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentPanelVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
    side?: "left" | "right";
    showNavigation?: boolean;
    onPrevious?: () => void;
    onNext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
  };

const AgentPanel = forwardRef<HTMLDivElement, AgentPanelProps>(
  (
    {
      className,
      size,
      open,
      onOpenChange,
      title,
      description,
      side = "right",
      showNavigation = false,
      onPrevious,
      onNext,
      hasPrevious = false,
      hasNext = false,
      children,
      ...props
    },
    ref
  ) => (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className={cn(agentPanelVariants({ size }), "p-0", className)}
        side={side}
      >
        <div className="flex h-full flex-col" ref={ref} {...props}>
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              {showNavigation && (
                <div className="flex items-center gap-1">
                  <Button
                    className="size-7"
                    disabled={!hasPrevious}
                    onClick={onPrevious}
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    className="size-7"
                    disabled={!hasNext}
                    onClick={onNext}
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
              <SheetHeader className="space-y-0 text-left">
                {title && (
                  <SheetTitle className="text-base">{title}</SheetTitle>
                )}
                {description && (
                  <p className="text-muted-foreground text-xs">{description}</p>
                )}
              </SheetHeader>
            </div>
            <Button
              className="size-7"
              onClick={() => onOpenChange?.(false)}
              size="icon"
              variant="ghost"
            >
              <Icons.X className="size-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">{children}</div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
);
AgentPanel.displayName = "AgentPanel";

const agentPanelSectionVariants = cva("", {
  variants: {
    spacing: {
      none: "",
      sm: "space-y-2",
      md: "space-y-4",
      lg: "space-y-6",
    },
  },
  defaultVariants: {
    spacing: "md",
  },
});

type AgentPanelSectionProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentPanelSectionVariants> & {
    title?: string;
  };

const AgentPanelSection = forwardRef<HTMLDivElement, AgentPanelSectionProps>(
  ({ className, spacing, title, children, ...props }, ref) => (
    <div
      className={cn(agentPanelSectionVariants({ spacing }), className)}
      ref={ref}
      {...props}
    >
      {title && (
        <h3 className="font-medium text-foreground text-sm">{title}</h3>
      )}
      {children}
    </div>
  )
);
AgentPanelSection.displayName = "AgentPanelSection";

const AgentPanelDivider = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div className={cn("my-4 h-px bg-border", className)} ref={ref} {...props} />
));
AgentPanelDivider.displayName = "AgentPanelDivider";

export {
  AgentPanel,
  AgentPanelDivider,
  AgentPanelSection,
  agentPanelSectionVariants,
  agentPanelVariants,
};
export type { AgentPanelProps, AgentPanelSectionProps };
