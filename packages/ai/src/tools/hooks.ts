import type { ToolExecutionResult, ToolMetadata } from "@openplane/types/ai";
import type { ToolContext, WebPermissionConfig } from "./types";
import { PERMISSION_MODE_CONFIGS } from "./types";

export type HookAction =
  | { action: "allow" }
  | { action: "deny"; reason: string }
  | { action: "modify"; params: Record<string, unknown> }
  | { action: "ask"; question: string };

export interface PreToolHookContext {
  toolName: string;
  toolMetadata: ToolMetadata;
  params: Record<string, unknown>;
  context: ToolContext;
}

export interface PostToolHookContext extends PreToolHookContext {
  result: ToolExecutionResult;
  durationMs: number;
}

export interface PreToolHook {
  name: string;
  priority: number;
  toolPattern?: string | RegExp;
  handler: (ctx: PreToolHookContext) => Promise<HookAction>;
}

export interface PostToolHook {
  name: string;
  priority: number;
  toolPattern?: string | RegExp;
  handler: (
    ctx: PostToolHookContext
  ) => Promise<ToolExecutionResult | undefined>;
}

export interface HookRegistryOptions {
  enablePreHooks?: boolean;
  enablePostHooks?: boolean;
}

export class HookRegistry {
  private readonly preHooks: PreToolHook[] = [];
  private readonly postHooks: PostToolHook[] = [];
  private readonly options: Required<HookRegistryOptions>;

  constructor(options: HookRegistryOptions = {}) {
    this.options = {
      enablePreHooks: options.enablePreHooks ?? true,
      enablePostHooks: options.enablePostHooks ?? true,
    };
  }

  registerPreHook(hook: PreToolHook): void {
    this.preHooks.push(hook);
    this.preHooks.sort((a, b) => a.priority - b.priority);
  }

  registerPostHook(hook: PostToolHook): void {
    this.postHooks.push(hook);
    this.postHooks.sort((a, b) => a.priority - b.priority);
  }

  unregisterPreHook(name: string): boolean {
    const index = this.preHooks.findIndex((h) => h.name === name);
    if (index !== -1) {
      this.preHooks.splice(index, 1);
      return true;
    }
    return false;
  }

  unregisterPostHook(name: string): boolean {
    const index = this.postHooks.findIndex((h) => h.name === name);
    if (index !== -1) {
      this.postHooks.splice(index, 1);
      return true;
    }
    return false;
  }

  async runPreHooks(ctx: PreToolHookContext): Promise<HookAction> {
    if (!this.options.enablePreHooks) {
      return { action: "allow" };
    }

    for (const hook of this.preHooks) {
      if (!this.matchesTool(ctx.toolName, hook.toolPattern)) {
        continue;
      }

      const result = await hook.handler(ctx);
      if (result.action !== "allow") {
        return result;
      }
    }

    return { action: "allow" };
  }

  async runPostHooks(
    ctx: PostToolHookContext
  ): Promise<ToolExecutionResult | undefined> {
    if (!this.options.enablePostHooks) {
      return;
    }

    let currentResult = ctx.result;

    for (const hook of this.postHooks) {
      if (!this.matchesTool(ctx.toolName, hook.toolPattern)) {
        continue;
      }

      const hookResult = await hook.handler({ ...ctx, result: currentResult });
      if (hookResult) {
        currentResult = hookResult;
      }
    }

    if (currentResult !== ctx.result) {
      return currentResult;
    }
  }

  getPreHooks(): readonly PreToolHook[] {
    return this.preHooks;
  }

  getPostHooks(): readonly PostToolHook[] {
    return this.postHooks;
  }

  private matchesTool(toolName: string, pattern?: string | RegExp): boolean {
    if (!pattern) {
      return true;
    }

    if (typeof pattern === "string") {
      if (pattern.includes("*")) {
        const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
        return regex.test(toolName);
      }
      return pattern === toolName;
    }

    return pattern.test(toolName);
  }
}

export const hookRegistry = new HookRegistry();

export function createAccessControlHook(
  checkPermission: (
    toolName: string,
    permissions: string[],
    ctx: ToolContext
  ) => Promise<boolean>
): PreToolHook {
  return {
    name: "access-control-check",
    priority: 0,
    async handler(ctx) {
      const requiredPermissions = ctx.toolMetadata.requiredPermissions ?? [];
      if (requiredPermissions.length === 0) {
        return { action: "allow" };
      }

      const allowed = await checkPermission(
        ctx.toolName,
        requiredPermissions,
        ctx.context
      );

      if (!allowed) {
        return {
          action: "deny",
          reason: `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
        };
      }

      return { action: "allow" };
    },
  };
}

export interface RateLimitConfig {
  maxCallsPerMinute: number;
  maxCallsPerHour: number;
}

export function createRateLimitHook(
  rateLimitConfig: RateLimitConfig,
  checkRateLimit: (
    userId: string,
    toolName: string,
    config: RateLimitConfig
  ) => Promise<{ allowed: boolean; retryAfterMs?: number }>
): PreToolHook {
  return {
    name: "rate-limit-ai-operations",
    priority: 10,
    async handler(ctx) {
      const result = await checkRateLimit(
        ctx.context.userId,
        ctx.toolName,
        rateLimitConfig
      );

      if (!result.allowed) {
        return {
          action: "deny",
          reason: `Rate limit exceeded. Retry after ${result.retryAfterMs ?? 60_000}ms.`,
        };
      }

      return { action: "allow" };
    },
  };
}

export interface AuditLogEntry {
  timestamp: Date;
  toolName: string;
  params: Record<string, unknown>;
  userId: string;
  teamId: string;
  correlationId?: string;
  action: "execute" | "deny" | "modify";
  reason?: string;
}

export function createAuditLoggingHook(
  logEntry: (entry: AuditLogEntry) => Promise<void>
): PreToolHook {
  return {
    name: "audit-logging",
    priority: 100,
    async handler(ctx) {
      await logEntry({
        timestamp: new Date(),
        toolName: ctx.toolName,
        params: ctx.params,
        userId: ctx.context.userId,
        teamId: ctx.context.teamId,
        correlationId: ctx.context.correlationId,
        action: "execute",
      });

      return { action: "allow" };
    },
  };
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /credentials?/i,
  /ssn/i,
  /credit[_-]?card/i,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
];

export function createRedactSensitiveDataHook(): PostToolHook {
  return {
    name: "redact-sensitive-data",
    priority: 0,
    handler(ctx) {
      if (!(ctx.result.success && ctx.result.data)) {
        return Promise.resolve(undefined);
      }

      const redactedData = redactSensitive(ctx.result.data);
      if (redactedData !== ctx.result.data) {
        return Promise.resolve({
          ...ctx.result,
          data: redactedData,
          metadata: {
            ...ctx.result.metadata,
            latencyMs: ctx.result.metadata?.latencyMs ?? 0,
            redacted: true,
          },
        });
      }
      return Promise.resolve(undefined);
    },
  };
}

function redactSensitive(data: unknown): unknown {
  if (typeof data === "string") {
    let result = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      result = result.replace(pattern, "[REDACTED]");
    }
    return result;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitive);
  }

  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_PATTERNS.some((p) => p.test(key))) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactSensitive(value);
      }
    }
    return result;
  }

  return data;
}

export interface ProvenanceInfo {
  toolName: string;
  executedAt: Date;
  durationMs: number;
  teamId: string;
  userId: string;
  correlationId?: string;
}

export function createProvenanceTrackingHook(): PostToolHook {
  return {
    name: "add-provenance-tracking",
    priority: 50,
    handler(ctx) {
      if (!(ctx.result.success && ctx.result.data)) {
        return Promise.resolve(undefined);
      }

      const provenance: ProvenanceInfo = {
        toolName: ctx.toolName,
        executedAt: new Date(),
        durationMs: ctx.durationMs,
        teamId: ctx.context.teamId,
        userId: ctx.context.userId,
        correlationId: ctx.context.correlationId,
      };

      return Promise.resolve({
        ...ctx.result,
        data: {
          ...(typeof ctx.result.data === "object"
            ? ctx.result.data
            : { value: ctx.result.data }),
          _provenance: provenance,
        },
        metadata: {
          ...ctx.result.metadata,
          latencyMs: ctx.result.metadata?.latencyMs ?? 0,
        },
      });
    },
  };
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export function checkWebPermission(
  toolName: string,
  toolMetadata: ToolMetadata,
  permissionConfig: WebPermissionConfig
): PermissionCheckResult {
  const modeConfig = PERMISSION_MODE_CONFIGS[permissionConfig.mode];

  if (permissionConfig.customDeniedTools?.includes(toolName)) {
    return {
      allowed: false,
      reason: `Tool "${toolName}" is explicitly denied for this session`,
    };
  }

  if (permissionConfig.customAllowedTools?.includes(toolName)) {
    return {
      allowed: true,
      requiresApproval: modeConfig.requiresApproval,
    };
  }

  if (modeConfig.deniedTools?.includes(toolName)) {
    return {
      allowed: false,
      reason: `Tool "${toolName}" is not allowed in ${permissionConfig.mode} mode`,
    };
  }

  if (
    modeConfig.allowedTools?.length &&
    !modeConfig.allowedTools.includes(toolName)
  ) {
    return {
      allowed: false,
      reason: `Tool "${toolName}" is not in the allowed list for ${permissionConfig.mode} mode`,
    };
  }

  if (!modeConfig.allowedCategories.includes(toolMetadata.category)) {
    return {
      allowed: false,
      reason: `Category "${toolMetadata.category}" is not allowed in ${permissionConfig.mode} mode`,
    };
  }

  return {
    allowed: true,
    requiresApproval: modeConfig.requiresApproval,
  };
}

export function createPermissionModeHook(
  getPermissionConfig: (ctx: ToolContext) => WebPermissionConfig | undefined
): PreToolHook {
  return {
    name: "permission-mode-check",
    priority: 5,
    async handler(ctx) {
      const permissionConfig = getPermissionConfig(ctx.context);
      if (!permissionConfig) {
        return { action: "allow" };
      }

      const result = checkWebPermission(
        ctx.toolName,
        ctx.toolMetadata,
        permissionConfig
      );

      if (!result.allowed) {
        return {
          action: "deny",
          reason: result.reason ?? "Permission denied",
        };
      }

      if (result.requiresApproval && permissionConfig.approvalCallback) {
        const approved = await permissionConfig.approvalCallback(
          ctx.toolName,
          ctx.params
        );
        if (!approved) {
          return {
            action: "deny",
            reason: `User did not approve execution of "${ctx.toolName}"`,
          };
        }
      }

      return { action: "allow" };
    },
  };
}
