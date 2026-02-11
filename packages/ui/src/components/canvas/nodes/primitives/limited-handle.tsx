"use client";

import type { HandleVariant } from "@openplane/types/canvas";
import type { HandleProps } from "@xyflow/react";
import { Handle, useNodeConnections } from "@xyflow/react";
import { memo } from "react";
import { cn } from "../../../../utils";

interface LimitedHandleProps extends HandleProps {
  maxConnections?: number;
  variant?: HandleVariant;
}

const VARIANT_STYLES: Record<HandleVariant, string> = {
  default: "border-border",
  true: "border-green-500",
  false: "border-red-500",
  loop: "border-orange-500",
  done: "border-blue-500",
};

export const LimitedHandle = memo(function LimitedHandleComponent({
  maxConnections = Number.POSITIVE_INFINITY,
  variant = "default",
  className,
  ...props
}: LimitedHandleProps) {
  const connections = useNodeConnections({ handleType: props.type });
  const isAtLimit = connections.length >= maxConnections;

  return (
    <Handle
      {...props}
      className={cn(
        "!size-3 rounded-full border-2 bg-background transition-colors",
        VARIANT_STYLES[variant],
        isAtLimit && "cursor-not-allowed opacity-40",
        className
      )}
      isConnectable={!isAtLimit}
    />
  );
});
LimitedHandle.displayName = "LimitedHandle";
