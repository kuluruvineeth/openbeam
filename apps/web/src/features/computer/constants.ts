export const RUN_STATUS_COLOR: Record<string, string> = {
  COMPLETED: "text-emerald-600",
  FAILED: "text-destructive",
  RUNNING: "text-amber-600",
  PENDING: "text-muted-foreground",
  WAITING_APPROVAL: "text-violet-600",
};

export const RUN_STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
  RUNNING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PENDING: "bg-muted text-muted-foreground border-border/50",
  WAITING_APPROVAL: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  REJECTED: "bg-muted text-muted-foreground border-border/30",
};

export const AGENT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  PAUSED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DRAFT: "bg-muted text-muted-foreground border-border/50",
  ERROR: "bg-destructive/10 text-destructive border-destructive/20",
  ARCHIVED: "bg-muted text-muted-foreground border-border/30",
};

const KNOWN_CRONS: Record<string, string> = {
  "0 8 * * 1": "Weekly \u00b7 Mon 8am",
  "0 9 * * *": "Daily \u00b7 9am",
  "0 10 * * *": "Daily \u00b7 10am",
  "0 6 * * *": "Daily \u00b7 6am",
  "0 15 * * 5": "Weekly \u00b7 Fri 3pm",
  "0 */6 * * *": "Every 6 hours",
  "0 0 * * *": "Daily \u00b7 midnight",
  "*/30 * * * *": "Every 30 minutes",
  "0 */4 * * *": "Every 4 hours",
};

export function humanCron(cron: string): string {
  return KNOWN_CRONS[cron] ?? cron;
}
