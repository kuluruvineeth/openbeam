export interface DateContext {
  date: string;
  year: number;
  quarter: number;
  monthStart: string;
  quarterStart: string;
  yearStart: string;
  timezone: string;
}

function getQuarter(month: number): number {
  return Math.floor(month / 3) + 1;
}

function padDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function getDateContext(timezone: string | null): DateContext {
  const tz = timezone ?? "UTC";
  const now = new Date();

  let formatted: { year: number; month: number; day: number };
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);
    formatted = { year: get("year"), month: get("month") - 1, day: get("day") };
  } catch {
    formatted = {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth(),
      day: now.getUTCDate(),
    };
  }

  const { year, month, day } = formatted;
  const quarterStartMonth = Math.floor(month / 3) * 3;

  return {
    date: padDate(year, month, day),
    year,
    quarter: getQuarter(month),
    monthStart: padDate(year, month, 1),
    quarterStart: padDate(year, quarterStartMonth, 1),
    yearStart: padDate(year, 0, 1),
    timezone: tz,
  };
}

export const MCP_TEXT_LIMIT = 25_000;

interface PaginatedResponse<T> {
  [key: string]: unknown;
  meta: {
    cursor?: string | null;
    hasNextPage: boolean;
    [key: string]: unknown;
  };
  data: T[];
}

export function truncateListResponse<T>(response: PaginatedResponse<T>): {
  text: string;
  structuredContent: PaginatedResponse<T>;
} {
  let text = JSON.stringify(response);

  if (text.length <= MCP_TEXT_LIMIT) {
    return { text, structuredContent: response };
  }

  const data = [...response.data];
  while (data.length > 1 && text.length > MCP_TEXT_LIMIT) {
    data.pop();
    text = JSON.stringify({
      ...response,
      meta: {
        ...response.meta,
        hasNextPage: true,
        truncated: true,
        returnedItems: data.length,
      },
      data,
    });
  }

  const result: PaginatedResponse<T> = {
    ...response,
    meta: {
      ...response.meta,
      hasNextPage: true,
      truncated: true,
      returnedItems: data.length,
      hint: "Response truncated to fit context limits. Use cursor or narrow your filters to see more results.",
    },
    data: [...data],
  };
  text = JSON.stringify(result);

  return { text, structuredContent: result };
}

export type TextContent = { type: "text"; text: string };
export type ResourceContent = {
  type: "resource";
  resource: { uri: string; mimeType: string; blob: string };
};
export type McpContent = TextContent | ResourceContent;

export function withErrorHandling<Args extends unknown[], R>(
  handler: (...args: Args) => Promise<R>,
  fallbackMessage: string
): (...args: Args) => Promise<R> {
  return (async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: error instanceof Error ? error.message : fallbackMessage,
          },
        ],
        isError: true,
      } as R;
    }
  }) as (...args: Args) => Promise<R>;
}
