import type { NextRequest, NextResponse } from "next/server";
import { getServerClient, initServerClient } from "../clients/server";

const BOT_PATTERN = /bot|crawler|spider|crawling|googlebot|bingbot/i;

interface NextjsAnalyticsConfig {
  apiKey: string;
  host?: string;
}

export function createAnalyticsMiddleware(config: NextjsAnalyticsConfig) {
  initServerClient({ apiKey: config.apiKey, host: config.host });

  return function analyticsMiddleware(
    request: NextRequest,
    response: NextResponse
  ): NextResponse {
    let distinctId = request.cookies.get("ph_distinct_id")?.value;
    if (!distinctId) {
      distinctId = crypto.randomUUID();
      response.cookies.set("ph_distinct_id", distinctId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60,
      });
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    const isBot = BOT_PATTERN.test(userAgent);

    if (isBot) {
      const client = getServerClient();
      client.capture({
        distinctId: `bot_${distinctId}`,
        event: "$pageview",
        properties: {
          $current_url: request.url,
          $pathname: request.nextUrl.pathname,
          $user_agent: userAgent,
          is_bot: true,
        },
      });
    }

    return response;
  };
}

export const posthogRewriteConfig = {
  rewrites: async () => ({
    beforeFiles: [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ],
  }),
  skipTrailingSlashRedirect: true,
};

export async function flushAnalyticsAfterResponse(): Promise<void> {
  const client = getServerClient();
  await client.flush();
}

export function getDistinctIdFromRequest(request: NextRequest): string {
  return request.cookies.get("ph_distinct_id")?.value ?? "anonymous";
}

export async function getFeatureFlagsForRequest(
  request: NextRequest,
  flags: string[]
): Promise<Record<string, boolean | string>> {
  const distinctId = getDistinctIdFromRequest(request);
  const client = getServerClient();
  const allFlags = await client.getAllFlags(distinctId);
  const result: Record<string, boolean | string> = {};

  for (const flag of flags) {
    if (allFlags && flag in allFlags) {
      result[flag] = allFlags[flag] as boolean | string;
    }
  }

  return result;
}
