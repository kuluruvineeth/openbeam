const WHITESPACE_RE = /\s+/;

interface CronFields {
  minute: number[] | null;
  hour: number[] | null;
  dayOfMonth: number[] | null;
  month: number[] | null;
  dayOfWeek: number[] | null;
}

function parseField(field: string, min: number, max: number): number[] | null {
  if (field === "*") {
    return null;
  }

  if (field.startsWith("*/")) {
    const step = Number.parseInt(field.slice(2), 10);
    if (Number.isNaN(step) || step <= 0) {
      throw new Error(`Invalid cron step: ${field}`);
    }
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
      values.push(i);
    }
    return values;
  }

  const values = field.split(",").map((v) => {
    const n = Number.parseInt(v.trim(), 10);
    if (Number.isNaN(n) || n < min || n > max) {
      throw new Error(`Invalid cron value: ${v} (expected ${min}-${max})`);
    }
    return n;
  });

  return values;
}

export function parseCron(expression: string): CronFields {
  const parts = expression.trim().split(WHITESPACE_RE);
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression: expected 5 fields, got ${parts.length}`
    );
  }

  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dayOfWeek: parseField(parts[4], 0, 6),
  };
}

function fieldMatches(value: number, allowed: number[] | null): boolean {
  if (allowed === null) {
    return true;
  }
  return allowed.includes(value);
}

export function nextRun(expression: string, after?: Date): Date {
  const fields = parseCron(expression);
  const start = after ? new Date(after.getTime()) : new Date();
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const maxIterations = 525_960;
  for (let i = 0; i < maxIterations; i += 1) {
    const candidate = new Date(start.getTime() + i * 60_000);

    if (
      fieldMatches(candidate.getMonth() + 1, fields.month) &&
      fieldMatches(candidate.getDate(), fields.dayOfMonth) &&
      fieldMatches(candidate.getDay(), fields.dayOfWeek) &&
      fieldMatches(candidate.getHours(), fields.hour) &&
      fieldMatches(candidate.getMinutes(), fields.minute)
    ) {
      return candidate;
    }
  }

  throw new Error(`No matching time found within one year for: ${expression}`);
}
