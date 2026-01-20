"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { type ExternalToast, Toaster as SonnerToaster, toast } from "sonner";

import { cn } from "../../utils/cn";

function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: cn(
            "group toast",
            "border-border bg-background",
            "text-foreground",
            "rounded-lg shadow-lg"
          ),
          title: "text-sm font-medium",
          description: "text-sm text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
    />
  );
}

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const showToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      description: options?.description,
      duration: options?.duration,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      action: options?.action,
    }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      action: options?.action,
    }),

  warning: (message: string, options?: ToastOptions) =>
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration,
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      action: options?.action,
    }),

  info: (message: string, options?: ToastOptions) =>
    toast.info(message, {
      description: options?.description,
      duration: options?.duration,
      icon: <Info className="h-5 w-5 text-blue-500" />,
      action: options?.action,
    }),

  loading: (message: string, options?: Omit<ToastOptions, "action">) =>
    toast.loading(message, {
      description: options?.description,
      duration: options?.duration,
      icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
    }),

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: ExternalToast
  ) =>
    toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      ...options,
    }),

  ai: (message: string, options?: ToastOptions) =>
    toast(message, {
      description: options?.description,
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      action: options?.action,
      duration: options?.duration ?? 5000,
    }),

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },

  custom: toast.custom,
};

export { showToast, Toaster };
export type { ToastOptions };
