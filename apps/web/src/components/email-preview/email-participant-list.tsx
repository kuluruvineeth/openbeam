"use client";

type EmailParticipantListProps = {
  to?: string[];
  cc?: string[];
};

export function EmailParticipantList({ to, cc }: EmailParticipantListProps) {
  if ((!to || to.length === 0) && (!cc || cc.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-0.5 text-[11px] text-muted-foreground">
      {to && to.length > 0 && (
        <div className="flex gap-1">
          <span className="shrink-0 opacity-60">To:</span>
          <span className="truncate">{to.join(", ")}</span>
        </div>
      )}
      {cc && cc.length > 0 && (
        <div className="flex gap-1">
          <span className="shrink-0 opacity-60">Cc:</span>
          <span className="truncate">{cc.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
