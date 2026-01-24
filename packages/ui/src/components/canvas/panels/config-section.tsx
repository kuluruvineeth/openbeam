"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { forwardRef, memo, useState } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import { Icons } from "../../icons";

const sectionVariants = cva("border-border/50 border-b last:border-b-0", {
  variants: {
    variant: {
      default: "",
      highlighted: "bg-primary/5",
      warning: "bg-amber-500/5",
      error: "bg-destructive/5",
    },
    size: {
      default: "",
      compact: "[&_.section-content]:px-3 [&_.section-content]:py-2",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

interface ConfigSectionProps extends VariantProps<typeof sectionVariants> {
  title: string;
  description?: string;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  icon?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ConfigSection = memo(
  forwardRef<HTMLDivElement, ConfigSectionProps>(
    function ConfigSectionComponent(
      {
        title,
        description,
        badge,
        badgeVariant = "secondary",
        icon,
        defaultOpen = true,
        collapsible = true,
        actions,
        children,
        variant,
        size,
        className,
      },
      ref
    ) {
      const [isOpen, setIsOpen] = useState(defaultOpen);

      const headerContent = (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {collapsible && (
              <Icons.ChevronRight
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-90"
                )}
              />
            )}
            {icon && (
              <span className="shrink-0 text-muted-foreground">{icon}</span>
            )}
            <div className="min-w-0">
              <span className="font-medium text-sm">{title}</span>
              {description && (
                <p className="truncate text-muted-foreground text-xs">
                  {description}
                </p>
              )}
            </div>
            {badge !== undefined && (
              <Badge className="ml-1 shrink-0" variant={badgeVariant}>
                {badge}
              </Badge>
            )}
          </div>
          {actions && (
            <span className="flex shrink-0 items-center gap-1">{actions}</span>
          )}
        </div>
      );

      if (!collapsible) {
        return (
          <div
            className={cn(sectionVariants({ variant, size }), className)}
            ref={ref}
          >
            {headerContent}
            <div className="section-content min-w-0 space-y-4 overflow-hidden px-4 pb-4">
              {children}
            </div>
          </div>
        );
      }

      return (
        <Collapsible
          className={cn(sectionVariants({ variant, size }), className)}
          onOpenChange={setIsOpen}
          open={isOpen}
          ref={ref}
        >
          <CollapsibleTrigger asChild>
            <button
              className="w-full text-left transition-colors hover:bg-accent/50"
              type="button"
            >
              {headerContent}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="section-content fade-in-0 slide-in-from-top-1 min-w-0 animate-in space-y-4 overflow-hidden px-4 pb-4 duration-200">
              {children}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }
  )
);

ConfigSection.displayName = "ConfigSection";
