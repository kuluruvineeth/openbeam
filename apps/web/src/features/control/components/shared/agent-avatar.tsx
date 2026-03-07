"use client";

import type { ControlAgentStatus } from "@openbeam/types/control";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { AGENT_STATUS_META } from "../../constants";

type AgentAvatarProps = {
  name: string;
  status?: ControlAgentStatus;
  icon?: string | null;
  size?: "sm" | "default" | "lg";
  showStatus?: boolean;
  className?: string;
};

const SIZE_MAP = {
  sm: "size-6 text-xs",
  default: "size-8 text-sm",
  lg: "size-10 text-base",
} as const;

const DOT_SIZE_MAP = {
  sm: "size-2",
  default: "size-2.5",
  lg: "size-3",
} as const;

const ICON_SIZE_MAP = {
  sm: 14,
  default: 16,
  lg: 20,
} as const;

const NAME_SPLIT_RE = /[\s-_]+/;

export function AgentAvatar({
  name,
  status,
  size = "default",
  showStatus = true,
  className,
}: AgentAvatarProps) {
  const initials = name
    .split(NAME_SPLIT_RE)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const statusMeta = status ? AGENT_STATUS_META[status] : null;

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-sm bg-secondary font-medium text-muted-foreground",
          SIZE_MAP[size]
        )}
      >
        {initials || <Icons.BotIcon size={ICON_SIZE_MAP[size]} />}
      </div>
      {showStatus && statusMeta && (
        <span
          className={cn(
            "-right-0.5 -bottom-0.5 absolute rounded-full border-2 border-background",
            DOT_SIZE_MAP[size],
            statusMeta.dotColor
          )}
        />
      )}
    </div>
  );
}

type AgentIdentityProps = {
  name: string;
  title?: string | null;
  status?: ControlAgentStatus;
  icon?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
};

export function AgentIdentity({
  name,
  title,
  status,
  icon,
  size = "default",
  className,
}: AgentIdentityProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <AgentAvatar icon={icon} name={name} size={size} status={status} />
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{name}</p>
        {title && (
          <p className="truncate text-muted-foreground text-xs">{title}</p>
        )}
      </div>
    </div>
  );
}
