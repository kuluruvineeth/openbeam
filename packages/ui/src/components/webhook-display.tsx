"use client";

import { memo } from "react";
import { cn } from "../utils/cn";
import { Icons } from "./icons";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type AuthMethod = "none" | "hmac-sha256" | "bearer" | "basic" | "api-key";

interface WebhookDisplayProps {
  path: string;
  method?: HttpMethod;
  authentication?: AuthMethod;
  className?: string;
  compact?: boolean;
}

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/10 text-emerald-500",
  POST: "bg-blue-500/10 text-blue-500",
  PUT: "bg-amber-500/10 text-amber-500",
  PATCH: "bg-purple-500/10 text-purple-500",
  DELETE: "bg-red-500/10 text-red-500",
};

const AUTH_LABELS: Record<AuthMethod, string> = {
  none: "No Auth",
  "hmac-sha256": "HMAC",
  bearer: "Bearer",
  basic: "Basic",
  "api-key": "API Key",
};

const AUTH_ICONS: Record<AuthMethod, typeof Icons.LockIcon> = {
  none: Icons.AlertCircle,
  "hmac-sha256": Icons.ShieldIcon,
  bearer: Icons.LockIcon,
  basic: Icons.LockIcon,
  "api-key": Icons.LockIcon,
};

export const WebhookDisplay = memo(function WebhookDisplayComponent({
  path,
  method = "POST",
  authentication = "none",
  className,
  compact = false,
}: WebhookDisplayProps) {
  const AuthIcon = AUTH_ICONS[authentication];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <span
          className={cn(
            "rounded-sm px-1 py-0.5 font-medium font-mono text-[10px]",
            METHOD_STYLES[method]
          )}
        >
          {method}
        </span>
        <code className="truncate font-mono text-[10px] text-muted-foreground">
          /{path}
        </code>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 font-mono font-semibold text-[10px]",
            METHOD_STYLES[method]
          )}
        >
          {method}
        </span>
        <code className="truncate rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          /{path}
        </code>
      </div>
      <div className="flex items-center gap-1 text-[10px]">
        <AuthIcon
          className={cn(
            "size-3",
            authentication === "none" ? "text-amber-500" : "text-emerald-500"
          )}
        />
        <span className="text-muted-foreground">
          {AUTH_LABELS[authentication]}
        </span>
      </div>
    </div>
  );
});

WebhookDisplay.displayName = "WebhookDisplay";
