import { getServerClient } from "../clients/server";

interface TRPCAnalyticsContext {
  userId?: string;
  teamId?: string;
}

interface TRPCMiddlewareOptions<TContext> {
  ctx: TContext;
  path: string;
  type: "query" | "mutation" | "subscription";
  next: () => Promise<unknown>;
  rawInput?: unknown;
}

export function createTRPCAnalyticsMiddleware() {
  return async function analyticsMiddleware<
    TContext extends TRPCAnalyticsContext,
  >({ ctx, path, type, next }: TRPCMiddlewareOptions<TContext>) {
    const startTime = performance.now();
    const client = getServerClient();

    try {
      const result = await next();
      const duration = performance.now() - startTime;

      client.capture({
        distinctId: ctx.userId ?? "anonymous",
        event: "trpc_procedure",
        properties: {
          path,
          type,
          success: true,
          duration_ms: duration,
          team_id: ctx.teamId,
        },
        groups: ctx.teamId ? { team: ctx.teamId } : undefined,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const err = error as Error;

      client.capture({
        distinctId: ctx.userId ?? "anonymous",
        event: "trpc_procedure",
        properties: {
          path,
          type,
          success: false,
          duration_ms: duration,
          error_name: err.name,
          error_message: err.message,
          team_id: ctx.teamId,
        },
        groups: ctx.teamId ? { team: ctx.teamId } : undefined,
      });

      throw error;
    }
  };
}

export function createTRPCAIMiddleware() {
  return async function aiMiddleware<TContext extends TRPCAnalyticsContext>({
    ctx,
    path,
    type,
    next,
  }: TRPCMiddlewareOptions<TContext>) {
    const startTime = performance.now();

    const result = await next();
    const duration = performance.now() - startTime;

    const aiResult = result as {
      usage?: { inputTokens: number; outputTokens: number };
      model?: string;
      cost?: number;
    };

    if (aiResult.usage) {
      const client = getServerClient();
      client.capture({
        distinctId: ctx.userId ?? "anonymous",
        event: "trpc_ai_procedure",
        properties: {
          path,
          type,
          duration_ms: duration,
          input_tokens: aiResult.usage.inputTokens,
          output_tokens: aiResult.usage.outputTokens,
          model: aiResult.model,
          cost_usd: aiResult.cost,
          team_id: ctx.teamId,
        },
        groups: ctx.teamId ? { team: ctx.teamId } : undefined,
      });
    }

    return result;
  };
}

export function trackTRPCProcedure(options: {
  distinctId: string;
  path: string;
  type: "query" | "mutation" | "subscription";
  success: boolean;
  durationMs: number;
  teamId?: string;
  errorInfo?: { name: string; message: string };
}) {
  const client = getServerClient();
  client.capture({
    distinctId: options.distinctId,
    event: "trpc_procedure",
    properties: {
      path: options.path,
      type: options.type,
      success: options.success,
      duration_ms: options.durationMs,
      team_id: options.teamId,
      error_name: options.errorInfo?.name,
      error_message: options.errorInfo?.message,
    },
    groups: options.teamId ? { team: options.teamId } : undefined,
  });
}
