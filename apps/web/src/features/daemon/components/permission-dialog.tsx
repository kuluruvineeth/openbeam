"use client";

import type {
  AgentPermissionRequest,
  AgentPermissionResponse,
} from "@openplane/types/services/daemon";
import { Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { cva } from "class-variance-authority";
import { useCallback, useState } from "react";
import type { DaemonClient } from "../lib/daemon-client";
import { useSessionStore } from "../stores/session-store";
import type { PendingPermission } from "../types";

const permissionCardVariants = cva(
  "rounded-sm border px-4 py-3 text-sm transition-colors",
  {
    variants: {
      kind: {
        tool: "border-amber-500/30 bg-amber-500/5",
        plan: "border-blue-500/30 bg-blue-500/5",
        question: "border-purple-500/30 bg-purple-500/5",
        mode: "border-border/30 bg-muted/30",
        other: "border-border/30 bg-muted/30",
      },
    },
    defaultVariants: {
      kind: "other",
    },
  }
);

function PermissionKindIcon({
  kind,
}: {
  kind: AgentPermissionRequest["kind"];
}) {
  switch (kind) {
    case "tool":
      return (
        <Icons.Settings className="size-4 text-amber-600 dark:text-amber-400" />
      );
    case "plan":
      return (
        <Icons.Lightbulb className="size-4 text-blue-600 dark:text-blue-400" />
      );
    case "question":
      return (
        <Icons.Info className="size-4 text-purple-600 dark:text-purple-400" />
      );
    default:
      return <Icons.AlertCircle className="size-4 text-muted-foreground" />;
  }
}

function ToolCallSummary({ request }: { request: AgentPermissionRequest }) {
  if (!request.detail) {
    return null;
  }

  const detail = request.detail;

  switch (detail.type) {
    case "shell":
      return (
        <div className="mt-2 max-h-32 overflow-auto rounded-sm border border-border/30 bg-muted/20 p-2">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground leading-5">
            <span className="text-muted-foreground">$ </span>
            {detail.command}
          </pre>
        </div>
      );

    case "edit":
      return (
        <div className="mt-2 space-y-1">
          <span className="font-mono text-[11px] text-muted-foreground">
            {detail.filePath}
          </span>
          {detail.unifiedDiff && (
            <div className="max-h-32 overflow-auto rounded-sm border border-border/30 bg-muted/20 p-2">
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-5">
                {detail.unifiedDiff}
              </pre>
            </div>
          )}
        </div>
      );

    case "write":
      return (
        <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
          {detail.filePath}
        </span>
      );

    case "read":
      return (
        <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
          {detail.filePath}
        </span>
      );

    default:
      return null;
  }
}

function PlanPreview({ description }: { description: string }) {
  return (
    <div className="mt-2 max-h-48 overflow-auto rounded-sm border border-border/30 bg-muted/20 p-3">
      <p className="whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function PermissionCard({
  permission,
  serverId,
}: {
  permission: PendingPermission;
  serverId: string;
}) {
  const [isResponding, setIsResponding] = useState<"allow" | "deny" | null>(
    null
  );
  const session = useSessionStore((s) => s.sessions[serverId]);
  const setPendingPermissions = useSessionStore((s) => s.setPendingPermissions);

  const { request, agentId, key } = permission;

  const respond = useCallback(
    (behavior: "allow" | "deny") => {
      if (isResponding) {
        return;
      }

      setIsResponding(behavior);

      const client = session?.client as DaemonClient | null;
      if (!client) {
        return;
      }

      const response: AgentPermissionResponse =
        behavior === "allow"
          ? { behavior: "allow" }
          : { behavior: "deny", message: "Denied by user" };

      client.sendSessionMessage({
        type: "agent_permission_response",
        agentId,
        requestId: request.id,
        response,
      });

      setPendingPermissions(serverId, (prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    },
    [
      isResponding,
      session?.client,
      agentId,
      request.id,
      key,
      serverId,
      setPendingPermissions,
    ]
  );

  const handleAllow = useCallback(() => respond("allow"), [respond]);
  const handleDeny = useCallback(() => respond("deny"), [respond]);

  return (
    <div className={permissionCardVariants({ kind: request.kind })}>
      <div className="flex items-start gap-3">
        <PermissionKindIcon kind={request.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground text-xs">
              {request.title ?? request.name}
            </span>
            <span className="rounded-sm bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {request.kind}
            </span>
          </div>

          {request.description && request.kind === "plan" && (
            <PlanPreview description={request.description} />
          )}

          {request.description && request.kind !== "plan" && (
            <p className="mt-1 text-muted-foreground text-xs">
              {request.description}
            </p>
          )}

          {request.kind === "tool" && <ToolCallSummary request={request} />}

          <div className="mt-3 flex items-center gap-2">
            <Button
              className="h-7 gap-1.5 px-3 text-xs"
              disabled={isResponding !== null}
              onClick={handleAllow}
              size="sm"
              variant="default"
            >
              {isResponding === "allow" ? (
                <Icons.Loader2 className="size-3 animate-spin" />
              ) : (
                <Icons.Check className="size-3" />
              )}
              Allow
            </Button>
            <Button
              className="h-7 gap-1.5 px-3 text-xs"
              disabled={isResponding !== null}
              onClick={handleDeny}
              size="sm"
              variant="outline"
            >
              {isResponding === "deny" ? (
                <Icons.Loader2 className="size-3 animate-spin" />
              ) : (
                <Icons.Close className="size-3" />
              )}
              Deny
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
