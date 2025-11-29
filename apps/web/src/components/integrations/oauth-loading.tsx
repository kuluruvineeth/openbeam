"use client";

import { Icons } from "@/components/icons";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";

type OAuthLoadingState = "connecting" | "processing" | "success" | "error";

interface OAuthLoadingProps {
  state: OAuthLoadingState;
  integration?: string;
  message?: string;
}

export function OAuthLoading({
  state,
  integration = "service",
  message,
}: OAuthLoadingProps) {
  const isLoading = state === "connecting" || state === "processing";

  const statusConfig = {
    connecting: {
      title: `Connecting to ${integration}`,
      description: message || "Redirecting to authorize...",
    },
    processing: {
      title: "Completing authentication",
      description: message || "Please wait...",
    },
    success: {
      title: "Connected",
      description: message || `Successfully connected to ${integration}`,
    },
    error: {
      title: "Connection failed",
      description: message || "Unable to complete the connection",
    },
  };

  const { title, description } = statusConfig[state];

  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Status indicator */}
      <div className="relative mb-6">
        {isLoading && <Spinner className="text-primary" size={24} />}
        {state === "success" && (
          <div className="flex size-6 items-center justify-center">
            <Icons.CheckIcon className="text-openplane-green" size={20} />
          </div>
        )}
        {state === "error" && (
          <div className="flex size-6 items-center justify-center">
            <Icons.XIcon className="text-destructive" size={20} />
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="space-y-1.5 text-center">
        <p
          className={cn(
            "font-medium text-sm tracking-tight",
            state === "error" && "text-destructive",
            state === "success" && "text-openplane-green",
            isLoading && "text-foreground"
          )}
        >
          {title}
        </p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
