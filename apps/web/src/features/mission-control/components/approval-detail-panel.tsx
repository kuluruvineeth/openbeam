"use client";

import type { MissionApprovalQueueItem } from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApprovalRiskBadge } from "./approval-risk-badge";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

function formatRelativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < MINUTE_MS) {
    return "just now";
  }
  if (delta < HOUR_MS) {
    return `${Math.floor(delta / MINUTE_MS)}m ago`;
  }
  return `${Math.floor(delta / HOUR_MS)}h ago`;
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "Expired";
  }
  const minutes = Math.floor(remainingMs / MINUTE_MS);
  const seconds = Math.floor((remainingMs % MINUTE_MS) / 1000);
  return `Expires in ${minutes}m ${seconds}s`;
}

function ExpirationCountdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => expiresAt - Date.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      setRemaining(expiresAt - Date.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [expiresAt]);

  const isExpired = remaining <= 0;

  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-xs tabular-nums ${
        isExpired ? "text-red-600" : "text-amber-600"
      }`}
    >
      <Icons.Clock size={12} />
      {formatCountdown(remaining)}
    </div>
  );
}

function ToolParamsDisplay({ params }: { params: Record<string, unknown> }) {
  return (
    <div className="rounded-sm border border-border/50 bg-muted/30 p-2">
      {Object.entries(params).map(([key, value]) => (
        <div className="flex items-start gap-2 py-0.5" key={key}>
          <span className="shrink-0 font-mono text-muted-foreground text-xs">
            {key}:
          </span>
          <span className="break-all font-mono text-xs">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

type ApprovalDetailPanelProps = {
  approval: MissionApprovalQueueItem | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
};

export function ApprovalDetailPanel({
  approval,
  onApprove,
  onReject,
}: ApprovalDetailPanelProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRejectMode(false);
    setRejectReason("");
  }, []);

  useEffect(() => {
    if (rejectMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [rejectMode]);

  const handleReject = useCallback(() => {
    if (!approval) {
      return;
    }
    if (!rejectMode) {
      setRejectMode(true);
      return;
    }
    onReject(approval.approvalId, rejectReason || undefined);
    setRejectMode(false);
    setRejectReason("");
  }, [approval, rejectMode, rejectReason, onReject]);

  const handleApprove = useCallback(() => {
    if (!approval) {
      return;
    }
    onApprove(approval.approvalId);
  }, [approval, onApprove]);

  if (!approval) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Select an approval to view details
      </div>
    );
  }

  const isPending = approval.status === "pending";

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/50 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icons.BotIcon className="text-muted-foreground" size={16} />
            <span className="font-medium text-sm">{approval.agentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <ApprovalRiskBadge risk={approval.riskLevel} />
            <span className="text-muted-foreground text-xs">
              {formatRelativeTime(approval.requestedAt)}
            </span>
          </div>
        </div>
        {approval.expiresAt && (
          <div className="mt-1.5">
            <ExpirationCountdown expiresAt={approval.expiresAt} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          <section>
            <h3 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Action
            </h3>
            <p className="text-sm">{approval.actionIntent}</p>
          </section>

          {approval.toolName && (
            <section>
              <h3 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Tool
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-border/50 px-2 py-0.5 font-mono text-xs">
                <Icons.Wrench className="text-muted-foreground" size={12} />
                {approval.toolName}
              </span>
              {approval.toolParams &&
                Object.keys(approval.toolParams).length > 0 && (
                  <div className="mt-2">
                    <ToolParamsDisplay params={approval.toolParams} />
                  </div>
                )}
            </section>
          )}

          {approval.riskFactors && approval.riskFactors.length > 0 && (
            <section>
              <h3 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Risk Factors
              </h3>
              <ul className="space-y-1">
                {approval.riskFactors.map((factor, i) => (
                  <li
                    className="flex items-start gap-2 text-sm"
                    key={`${factor}-${i}`}
                  >
                    <Icons.AlertCircle
                      className="mt-0.5 shrink-0 text-amber-500"
                      size={14}
                    />
                    {factor}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {approval.affectedResources &&
            approval.affectedResources.length > 0 && (
              <section>
                <h3 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Affected Resources
                </h3>
                <ul className="space-y-1">
                  {approval.affectedResources.map((resource, i) => (
                    <li
                      className="flex items-start gap-2 text-sm"
                      key={`${resource}-${i}`}
                    >
                      <Icons.FileIcon
                        className="mt-0.5 shrink-0 text-muted-foreground"
                        size={14}
                      />
                      {resource}
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {approval.status !== "pending" && (
            <section>
              <h3 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Resolution
              </h3>
              <p className="text-sm capitalize">{approval.status}</p>
              {approval.reason && (
                <p className="mt-1 text-muted-foreground text-sm">
                  {approval.reason}
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      {isPending && (
        <div className="border-border/50 border-t px-4 py-3">
          {rejectMode && (
            <textarea
              className="mb-2 w-full resize-none rounded-sm border border-border/50 bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              onChange={(e) => setRejectReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setRejectMode(false);
                  setRejectReason("");
                }
                if (e.key === "Enter" && e.metaKey) {
                  e.preventDefault();
                  handleReject();
                }
              }}
              placeholder="Rejection reason (optional)"
              ref={textareaRef}
              rows={2}
              value={rejectReason}
            />
          )}
          <div className="flex items-center gap-2">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-border/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
              onClick={handleReject}
              type="button"
            >
              <Icons.Close size={14} />
              {rejectMode ? "Confirm Reject" : "Reject"}
              <kbd className="ml-auto rounded border border-border/50 px-1 font-mono text-[10px] text-muted-foreground">
                R
              </kbd>
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
              onClick={handleApprove}
              type="button"
            >
              <Icons.Check size={14} />
              Approve
              <kbd className="ml-auto rounded border border-primary-foreground/20 px-1 font-mono text-[10px] text-primary-foreground/70">
                A
              </kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
