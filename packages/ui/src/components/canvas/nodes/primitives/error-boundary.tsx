"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { cn } from "../../../../utils";

interface NodeErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
  className?: string;
}

function DefaultFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-sm bg-destructive/10 px-2 py-1.5 text-destructive text-xs",
        className
      )}
    >
      <AlertTriangle className="size-3.5 shrink-0" />
      <span className="truncate">Failed to render</span>
    </div>
  );
}

export function NodeErrorBoundary({
  children,
  fallback,
  onError,
  className,
}: NodeErrorBoundaryProps) {
  const handleError = (
    error: unknown,
    info: { componentStack?: string | null }
  ) => {
    if (error instanceof Error) {
      onError?.(error, info);
    }
  };

  const renderFallback = (_props: FallbackProps) => {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <DefaultFallback className={className} />;
  };

  return (
    <ErrorBoundary fallbackRender={renderFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
