"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@openplane/ui";
import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

export const AvatarImageNext = React.forwardRef<
  React.ComponentRef<typeof Image>,
  React.ComponentPropsWithoutRef<typeof Image>
>(({ className, onError, ...props }, ref) => {
  const [hasError, setHasError] = React.useState(false);

  if (hasError || !props.src) {
    return null;
  }

  return (
    <Image
      className={cn("absolute z-10 aspect-square h-full w-full", className)}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
      ref={ref}
      {...props}
    />
  );
});

AvatarImageNext.displayName = "AvatarImageNext";

export { Avatar, AvatarFallback, AvatarImage };
