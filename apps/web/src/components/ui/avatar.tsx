"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@openbeam/ui";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AvatarImageNext({ className, onError, ...props }: ImageProps) {
  const [hasError, setHasError] = useState(false);

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
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
