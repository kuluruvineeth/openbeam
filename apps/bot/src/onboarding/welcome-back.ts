const MS_PER_DAY = 86_400_000;
const SHORT_ABSENCE_DAYS = 3;
const LONG_ABSENCE_DAYS = 7;

export function buildWelcomeBack(
  lastSeenIso: string | null,
  lastQuery: string | null,
  newConnectorCount: number
): string | null {
  if (!lastSeenIso) {
    return null;
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(lastSeenIso).getTime()) / MS_PER_DAY
  );

  if (daysSince < SHORT_ABSENCE_DAYS) {
    return null;
  }

  if (daysSince >= LONG_ABSENCE_DAYS && newConnectorCount > 0) {
    return `It's been ${daysSince} days! Your team added ${newConnectorCount} new connector${newConnectorCount > 1 ? "s" : ""} since you were last here.`;
  }

  if (lastQuery) {
    return `Welcome back! Last time you asked about "${lastQuery}". Want to continue?`;
  }

  return "Welcome back! What do you need today?";
}
