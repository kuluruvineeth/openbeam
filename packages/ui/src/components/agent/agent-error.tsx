"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";

const agentErrorVariants = cva("rounded-lg border p-4", {
  variants: {
    variant: {
      default: "border-destructive/30 bg-destructive/5",
      warning: "border-yellow-500/30 bg-yellow-500/5",
      inline: "border-destructive/20 bg-transparent p-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type ErrorCode =
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "TIMEOUT"
  | "INVALID_INPUT"
  | "PROVIDER_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

interface AgentErrorInfo {
  code: ErrorCode;
  message: string;
  details?: string;
  retryable: boolean;
}

type AgentErrorProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentErrorVariants> & {
    error: AgentErrorInfo;
    onRetry?: () => void;
    onDismiss?: () => void;
    showDetails?: boolean;
    isRetrying?: boolean;
  };

const errorCodeLabels: Record<ErrorCode, string> = {
  RATE_LIMITED: "Rate Limited",
  UNAUTHORIZED: "Unauthorized",
  NOT_FOUND: "Not Found",
  TIMEOUT: "Timeout",
  INVALID_INPUT: "Invalid Input",
  PROVIDER_ERROR: "Provider Error",
  NETWORK_ERROR: "Network Error",
  UNKNOWN: "Error",
};

type ErrorVariant = "default" | "warning" | "inline" | null | undefined;

function getIconComponent(variant: ErrorVariant) {
  return variant === "warning" ? AlertCircle : XCircle;
}

function getIconContainerClasses(
  variant: ErrorVariant,
  isInline: boolean
): string {
  const sizeClass = isInline ? "size-5" : "size-8";
  const bgClass =
    variant === "warning" ? "bg-yellow-500/10" : "bg-destructive/10";
  return cn(
    "flex shrink-0 items-center justify-center rounded-full",
    sizeClass,
    bgClass
  );
}

function getIconClasses(variant: ErrorVariant, isInline: boolean): string {
  const sizeClass = isInline ? "size-3" : "size-4";
  const colorClass =
    variant === "warning" ? "text-yellow-500" : "text-destructive";
  return cn(sizeClass, colorClass);
}

function getTitleClasses(variant: ErrorVariant, isInline: boolean): string {
  const sizeClass = isInline ? "text-xs" : "text-sm";
  const colorClass =
    variant === "warning"
      ? "text-yellow-600 dark:text-yellow-500"
      : "text-destructive";
  return cn("font-medium", sizeClass, colorClass);
}

interface ErrorActionsProps {
  error: AgentErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying: boolean;
}

function ErrorActions({
  error,
  onRetry,
  onDismiss,
  isRetrying,
}: ErrorActionsProps) {
  if (!(onRetry || onDismiss)) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      {error.retryable && onRetry && (
        <Button
          className="gap-1.5"
          disabled={isRetrying}
          onClick={onRetry}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={cn("size-3.5", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
      )}
      {onDismiss && (
        <Button onClick={onDismiss} size="sm" variant="ghost">
          Dismiss
        </Button>
      )}
    </div>
  );
}

interface InlineRetryButtonProps {
  error: AgentErrorInfo;
  onRetry?: () => void;
  isRetrying: boolean;
}

function InlineRetryButton({
  error,
  onRetry,
  isRetrying,
}: InlineRetryButtonProps) {
  if (!(error.retryable && onRetry)) {
    return null;
  }

  return (
    <Button
      className="size-6 shrink-0"
      disabled={isRetrying}
      onClick={onRetry}
      size="icon"
      variant="ghost"
    >
      <RefreshCw className={cn("size-3", isRetrying && "animate-spin")} />
    </Button>
  );
}

const AgentError = forwardRef<HTMLDivElement, AgentErrorProps>(
  (
    {
      className,
      variant,
      error,
      onRetry,
      onDismiss,
      showDetails = false,
      isRetrying = false,
      ...props
    },
    ref
  ) => {
    const isInline = variant === "inline";
    const Icon = getIconComponent(variant);

    return (
      <div
        className={cn(agentErrorVariants({ variant }), className)}
        ref={ref}
        {...props}
      >
        <div className={cn("flex gap-3", isInline && "items-center gap-2")}>
          <div className={getIconContainerClasses(variant, isInline)}>
            <Icon className={getIconClasses(variant, isInline)} />
          </div>
          <div
            className={cn(
              "min-w-0 flex-1",
              isInline && "flex items-center gap-2"
            )}
          >
            <div className={cn(!isInline && "flex items-center gap-2")}>
              <h4 className={getTitleClasses(variant, isInline)}>
                {errorCodeLabels[error.code]}
              </h4>
              {!isInline && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                  {error.code}
                </span>
              )}
            </div>
            <p
              className={
                isInline
                  ? "text-muted-foreground text-xs"
                  : "mt-1 text-muted-foreground text-sm"
              }
            >
              {error.message}
            </p>
            {showDetails && error.details && !isInline && (
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 font-mono text-muted-foreground text-xs">
                {error.details}
              </pre>
            )}
            {!isInline && (
              <ErrorActions
                error={error}
                isRetrying={isRetrying}
                onDismiss={onDismiss}
                onRetry={onRetry}
              />
            )}
          </div>
          {isInline && (
            <InlineRetryButton
              error={error}
              isRetrying={isRetrying}
              onRetry={onRetry}
            />
          )}
        </div>
      </div>
    );
  }
);
AgentError.displayName = "AgentError";

export { AgentError, agentErrorVariants };
export type { AgentErrorInfo, AgentErrorProps, ErrorCode };
