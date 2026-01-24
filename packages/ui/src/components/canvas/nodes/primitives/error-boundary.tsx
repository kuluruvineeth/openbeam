"use client";

import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "../../../../utils";

interface NodeErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

interface NodeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class NodeErrorBoundary extends Component<
  NodeErrorBoundaryProps,
  NodeErrorBoundaryState
> {
  constructor(props: NodeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): NodeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-sm bg-destructive/10 px-2 py-1.5 text-destructive text-xs",
            this.props.className
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="truncate">Failed to render</span>
        </div>
      );
    }

    return this.props.children;
  }
}
