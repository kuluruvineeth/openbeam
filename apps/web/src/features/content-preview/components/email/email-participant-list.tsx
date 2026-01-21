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
    <dl className="space-y-0.5 text-[11px] text-muted-foreground">
      {to && to.length > 0 && (
        <div className="flex gap-1">
          <dt className="shrink-0 opacity-60">To:</dt>
          <dd className="m-0 truncate">{to.join(", ")}</dd>
        </div>
      )}
      {cc && cc.length > 0 && (
        <div className="flex gap-1">
          <dt className="shrink-0 opacity-60">Cc:</dt>
          <dd className="m-0 truncate">{cc.join(", ")}</dd>
        </div>
      )}
    </dl>
  );
}
