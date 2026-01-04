import { AsyncLocalStorage } from "node:async_hooks";

export interface AnalyticsContext {
  userId?: string;
  teamId?: string;
  sessionId?: string;
  traceId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  featureFlags?: Record<string, boolean | string>;
  metadata?: Record<string, unknown>;
}

const analyticsStorage = new AsyncLocalStorage<AnalyticsContext>();

export function runWithAnalyticsContext<T>(
  context: AnalyticsContext,
  fn: () => T
): T {
  return analyticsStorage.run(context, fn);
}

export function runWithAnalyticsContextAsync<T>(
  context: AnalyticsContext,
  fn: () => Promise<T>
): Promise<T> {
  return analyticsStorage.run(context, fn);
}

export function getAnalyticsContext(): AnalyticsContext | undefined {
  return analyticsStorage.getStore();
}

export function requireAnalyticsContext(): AnalyticsContext {
  const context = analyticsStorage.getStore();
  if (!context) {
    throw new Error(
      "Analytics context not available. Use runWithAnalyticsContext."
    );
  }
  return context;
}

export function getUserId(): string | undefined {
  return analyticsStorage.getStore()?.userId;
}

export function requireUserId(): string {
  const userId = getUserId();
  if (!userId) {
    throw new Error("User ID not available in analytics context");
  }
  return userId;
}

export function getTeamId(): string | undefined {
  return analyticsStorage.getStore()?.teamId;
}

export function requireTeamId(): string {
  const teamId = getTeamId();
  if (!teamId) {
    throw new Error("Team ID not available in analytics context");
  }
  return teamId;
}

export function getTraceId(): string | undefined {
  return analyticsStorage.getStore()?.traceId;
}

export function getSessionId(): string | undefined {
  return analyticsStorage.getStore()?.sessionId;
}

export function getFeatureFlag(key: string): boolean | string | undefined {
  return analyticsStorage.getStore()?.featureFlags?.[key];
}

export function isFeatureEnabled(key: string): boolean {
  const value = getFeatureFlag(key);
  return value === true || value === "true";
}

export function updateAnalyticsContext(
  updates: Partial<AnalyticsContext>
): void {
  const current = analyticsStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}

export function setContextMetadata(key: string, value: unknown): void {
  const current = analyticsStorage.getStore();
  if (current) {
    current.metadata = current.metadata ?? {};
    current.metadata[key] = value;
  }
}

export function getContextMetadata<T = unknown>(key: string): T | undefined {
  return analyticsStorage.getStore()?.metadata?.[key] as T | undefined;
}

export interface ContextBuilder {
  withUserId(userId: string): ContextBuilder;
  withTeamId(teamId: string): ContextBuilder;
  withSessionId(sessionId: string): ContextBuilder;
  withTraceId(traceId: string): ContextBuilder;
  withRequestId(requestId: string): ContextBuilder;
  withFeatureFlags(flags: Record<string, boolean | string>): ContextBuilder;
  withMetadata(metadata: Record<string, unknown>): ContextBuilder;
  build(): AnalyticsContext;
  run<T>(fn: () => T): T;
  runAsync<T>(fn: () => Promise<T>): Promise<T>;
}

export function createContextBuilder(): ContextBuilder {
  const context: AnalyticsContext = {};

  const builder: ContextBuilder = {
    withUserId(userId: string) {
      context.userId = userId;
      return builder;
    },
    withTeamId(teamId: string) {
      context.teamId = teamId;
      return builder;
    },
    withSessionId(sessionId: string) {
      context.sessionId = sessionId;
      return builder;
    },
    withTraceId(traceId: string) {
      context.traceId = traceId;
      return builder;
    },
    withRequestId(requestId: string) {
      context.requestId = requestId;
      return builder;
    },
    withFeatureFlags(flags: Record<string, boolean | string>) {
      context.featureFlags = flags;
      return builder;
    },
    withMetadata(metadata: Record<string, unknown>) {
      context.metadata = metadata;
      return builder;
    },
    build() {
      return { ...context };
    },
    run<T>(fn: () => T): T {
      return runWithAnalyticsContext(context, fn);
    },
    runAsync<T>(fn: () => Promise<T>): Promise<T> {
      return runWithAnalyticsContextAsync(context, fn);
    },
  };

  return builder;
}

export function createAnalyticsContext(options: {
  userId?: string;
  teamId?: string;
  sessionId?: string;
  traceId?: string;
  requestId?: string;
}): AnalyticsContext {
  return {
    userId: options.userId,
    teamId: options.teamId,
    sessionId: options.sessionId,
    traceId: options.traceId ?? crypto.randomUUID(),
    requestId: options.requestId ?? crypto.randomUUID(),
  };
}

export function withTracing<T>(
  fn: () => T,
  options?: { traceId?: string; spanName?: string }
): T {
  const parentContext = getAnalyticsContext();
  const traceId =
    options?.traceId ?? parentContext?.traceId ?? crypto.randomUUID();

  return runWithAnalyticsContext(
    {
      ...parentContext,
      traceId,
      metadata: {
        ...parentContext?.metadata,
        spanName: options?.spanName,
      },
    },
    fn
  );
}

export function withTracingAsync<T>(
  fn: () => Promise<T>,
  options?: { traceId?: string; spanName?: string }
): Promise<T> {
  const parentContext = getAnalyticsContext();
  const traceId =
    options?.traceId ?? parentContext?.traceId ?? crypto.randomUUID();

  return runWithAnalyticsContextAsync(
    {
      ...parentContext,
      traceId,
      metadata: {
        ...parentContext?.metadata,
        spanName: options?.spanName,
      },
    },
    fn
  );
}
