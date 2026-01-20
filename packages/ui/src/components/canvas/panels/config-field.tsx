"use client";

import type { ReactNode } from "react";
import { forwardRef, memo } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { Label } from "../../label";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

interface ConfigFieldProps {
  label: string;
  description?: string;
  tooltip?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
  horizontal?: boolean;
}

export const ConfigField = memo(
  forwardRef<HTMLDivElement, ConfigFieldProps>(function ConfigFieldComponent(
    {
      label,
      description,
      tooltip,
      required,
      error,
      children,
      className,
      horizontal,
    },
    ref
  ) {
    return (
      <div
        className={cn(
          "space-y-1.5",
          horizontal && "flex items-center justify-between gap-4",
          className
        )}
        ref={ref}
      >
        <div
          className={cn("flex items-center gap-1.5", horizontal && "shrink-0")}
        >
          <Label className={cn("text-sm", error && "text-destructive")}>
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Icons.HelpCircle className="size-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="top">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {description && !horizontal && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
        <div className={cn(horizontal && "flex-1")}>{children}</div>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    );
  })
);

ConfigField.displayName = "ConfigField";
