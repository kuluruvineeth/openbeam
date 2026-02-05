"use client";

import { OTPInput, OTPInputContext } from "input-otp";
import type { ComponentProps } from "react";
import { forwardRef, useContext } from "react";
import { cn } from "../utils/cn";
import { Icons } from "./icons";

const InputOTP = forwardRef<
  React.ComponentRef<typeof OTPInput>,
  ComponentProps<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    className={cn("disabled:cursor-not-allowed", className)}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName
    )}
    ref={ref}
    {...props}
  />
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div className={cn("flex items-center", className)} ref={ref} {...props} />
  )
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = forwardRef<
  HTMLDivElement,
  ComponentProps<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];

  if (!slot) {
    return null;
  }

  const { char, hasFakeCaret, isActive } = slot;

  return (
    <div
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-input border-y border-r text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      ref={ref}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  ({ ...props }, ref) => (
    <div aria-hidden="true" ref={ref} {...props}>
      <Icons.Minus className="h-4 w-4" />
    </div>
  )
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
