import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import {
  captureImmediate,
  getServerClient,
  initServerClient,
} from "../clients/server";
import type { AnalyticsConfig } from "../config";

interface HonoAnalyticsEnv {
  Variables: {
    distinctId: string;
    teamId?: string;
    analytics: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      captureImmediate: (
        event: string,
        properties?: Record<string, unknown>
      ) => Promise<void>;
      identify: (properties: Record<string, unknown>) => void;
      setGroup: (groupType: string, groupKey: string) => void;
    };
  };
}

export function createHonoAnalyticsMiddleware(
  config: Partial<AnalyticsConfig> & { apiKey: string }
) {
  initServerClient(config);

  return createMiddleware<HonoAnalyticsEnv>(async (c, next) => {
    const client = getServerClient();
    const startTime = performance.now();

    const getUserId = (): string | undefined => {
      try {
        const user = (c as unknown as { get: (key: string) => unknown }).get(
          "user"
        );
        return (user as { id?: string } | undefined)?.id;
      } catch {
        return;
      }
    };

    const getTeamId = (): string | undefined => {
      try {
        const team = (c as unknown as { get: (key: string) => unknown }).get(
          "team"
        );
        return (team as { id?: string } | undefined)?.id;
      } catch {
        return;
      }
    };

    const distinctId =
      c.req.header("x-user-id") ??
      getUserId() ??
      c.req.header("x-distinct-id") ??
      "anonymous";

    const teamId = c.req.header("x-team-id") ?? getTeamId();

    c.set("distinctId", distinctId);
    if (teamId) {
      c.set("teamId", teamId);
    }

    c.set("analytics", {
      capture: (event: string, properties?: Record<string, unknown>) => {
        client.capture({
          distinctId,
          event,
          properties,
          groups: teamId ? { team: teamId } : undefined,
        });
      },
      captureImmediate: async (
        event: string,
        properties?: Record<string, unknown>
      ) => {
        await captureImmediate(
          distinctId,
          event,
          properties,
          teamId ? { team: teamId } : undefined
        );
      },
      identify: (properties: Record<string, unknown>) => {
        client.identify({ distinctId, properties });
      },
      setGroup: (groupType: string, groupKey: string) => {
        client.capture({
          distinctId,
          event: "$groupidentify",
          properties: {
            $group_type: groupType,
            $group_key: groupKey,
          },
        });
      },
    });

    await next();

    const duration = performance.now() - startTime;

    if (
      !(c.req.path.startsWith("/health") || c.req.path.startsWith("/ready"))
    ) {
      client.capture({
        distinctId,
        event: "api_request",
        properties: {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          duration_ms: duration,
          user_agent: c.req.header("user-agent"),
        },
        groups: teamId ? { team: teamId } : undefined,
      });
    }
  });
}

export function honoAnalyticsErrorHandler(err: Error, c: Context) {
  const client = getServerClient();
  const distinctId = (c.get("distinctId") as string | undefined) ?? "anonymous";

  client.capture({
    distinctId,
    event: "$exception",
    properties: {
      $exception_message: err.message,
      $exception_type: err.name,
      $exception_stack_trace_raw: err.stack,
      path: c.req.path,
      method: c.req.method,
    },
  });

  throw err;
}

export function getAnalyticsFromContext(
  c: Context
): HonoAnalyticsEnv["Variables"]["analytics"] {
  return c.get("analytics") as HonoAnalyticsEnv["Variables"]["analytics"];
}

export function getDistinctIdFromContext(c: Context): string {
  return (c.get("distinctId") as string) ?? "anonymous";
}

export function getTeamIdFromContext(c: Context): string | undefined {
  return c.get("teamId") as string | undefined;
}
