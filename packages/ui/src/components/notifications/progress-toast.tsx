"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { cn } from "../../utils/cn";
import { Icons } from "../icons";

type ProgressStatus = "loading" | "success" | "error";

interface ProgressToastOptions {
  title: string;
  description?: string;
  onCancel?: () => void;
}

interface ProgressToastControls {
  update: (progress: number, message?: string) => void;
  success: (message?: string) => void;
  error: (message?: string) => void;
  dismiss: () => void;
}

interface ProgressToastContentProps {
  title: string;
  description?: string;
  progress: number;
  status?: ProgressStatus;
  onCancel?: () => void;
}

function ProgressToastContent({
  title,
  description,
  progress,
  status = "loading",
  onCancel,
}: ProgressToastContentProps) {
  return (
    <div
      className={cn(
        "flex min-w-[300px] items-start gap-3 rounded-lg p-4",
        "border border-border bg-background shadow-lg"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {status === "loading" && (
          <Icons.Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {status === "success" && (
          <Icons.CheckCircle2 className="h-5 w-5 text-emerald-500" />
        )}
        {status === "error" && (
          <Icons.XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="mt-0.5 text-muted-foreground text-sm">{description}</p>
        )}

        {status === "loading" && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs tabular-nums">
                {progress}%
              </span>
              {onCancel && (
                <button
                  className="text-muted-foreground text-xs hover:text-foreground"
                  onClick={onCancel}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function useProgressToast(): (
  options: ProgressToastOptions
) => ProgressToastControls {
  const toastIdRef = useRef<string | number>(undefined);

  return useCallback(
    ({ title, description, onCancel }: ProgressToastOptions) => {
      const id = toast.custom(
        () => (
          <ProgressToastContent
            description={description}
            onCancel={onCancel}
            progress={0}
            title={title}
          />
        ),
        { duration: Number.POSITIVE_INFINITY }
      );

      toastIdRef.current = id;

      return {
        update: (progress: number, message?: string) => {
          toast.custom(
            () => (
              <ProgressToastContent
                description={message ?? description}
                onCancel={onCancel}
                progress={progress}
                title={title}
              />
            ),
            { id, duration: Number.POSITIVE_INFINITY }
          );
        },

        success: (message?: string) => {
          toast.custom(
            () => (
              <ProgressToastContent
                description={message ?? "Completed"}
                progress={100}
                status="success"
                title={title}
              />
            ),
            { id, duration: 3000 }
          );
        },

        error: (message?: string) => {
          toast.custom(
            () => (
              <ProgressToastContent
                description={message ?? "Failed"}
                progress={0}
                status="error"
                title={title}
              />
            ),
            { id, duration: 5000 }
          );
        },

        dismiss: () => {
          toast.dismiss(id);
        },
      };
    },
    []
  );
}

export { ProgressToastContent, useProgressToast };
export type {
  ProgressStatus,
  ProgressToastContentProps,
  ProgressToastControls,
  ProgressToastOptions,
};
