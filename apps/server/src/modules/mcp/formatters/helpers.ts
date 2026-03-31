const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return "never";
  }
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE) {
    return "just now";
  }
  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)}m ago`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)}h ago`;
  }
  return `${Math.floor(diff / DAY)}d ago`;
}

export function num(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return String(n);
}

export function plural(
  n: number,
  singular: string,
  pluralForm?: string
): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralForm ?? `${singular}s`}`;
}

export function lines(items: string[]): string {
  return items.join("\n");
}

export function numbered(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

export function section(title: string, body: string): string {
  return `${title}\n${body}`;
}
