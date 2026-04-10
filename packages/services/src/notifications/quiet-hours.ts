export function isInQuietHours(params: {
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string;
  now?: Date;
}): boolean {
  const { quietHoursStart, quietHoursEnd, timezone } = params;
  if (quietHoursStart === null || quietHoursEnd === null) {
    return false;
  }

  const now = params.now ?? new Date();
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const currentHour = Number(hourStr);

  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  }
  return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
}
