import type { McpAuthContext } from "./auth";

export interface McpAuditEntry {
  timestamp: Date;
  toolName: string;
  args: Record<string, unknown> | undefined;
  teamId: string;
  userId: string;
  source: string;
  permissionMode: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

export type AuditSink = (entries: McpAuditEntry[]) => Promise<void>;

const auditBuffer: McpAuditEntry[] = [];
const MAX_BUFFER_SIZE = 200;
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_THRESHOLD = 50;

let activeSink: AuditSink | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let shutdownRegistered = false;

function enqueueEntry(entry: McpAuditEntry): void {
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.shift();
  }

  if (activeSink && auditBuffer.length >= FLUSH_THRESHOLD) {
    flushBuffer().catch(logFlushError);
  }
}

async function flushBuffer(): Promise<void> {
  if (!activeSink || auditBuffer.length === 0) {
    return;
  }

  const batch = auditBuffer.splice(0, auditBuffer.length);
  try {
    await activeSink(batch);
  } catch (err) {
    logFlushError(err);
    auditBuffer.unshift(...batch);
    if (auditBuffer.length > MAX_BUFFER_SIZE) {
      auditBuffer.length = MAX_BUFFER_SIZE;
    }
  }
}

function logFlushError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[mcp-audit] flush error: ${message}\n`);
}

function registerShutdownHooks(): void {
  if (shutdownRegistered) {
    return;
  }
  shutdownRegistered = true;

  const onShutdown = () => {
    flushBuffer().catch(logFlushError);
  };

  process.on("beforeExit", onShutdown);
  process.on("SIGTERM", () => {
    flushBuffer()
      .catch(logFlushError)
      .finally(() => process.exit(0));
  });
  process.on("SIGINT", () => {
    flushBuffer()
      .catch(logFlushError)
      .finally(() => process.exit(0));
  });
}

export function setAuditSink(sink: AuditSink): void {
  activeSink = sink;
  registerShutdownHooks();

  if (!flushTimer) {
    flushTimer = setInterval(() => {
      flushBuffer().catch(logFlushError);
    }, FLUSH_INTERVAL_MS);

    if (typeof flushTimer === "object" && "unref" in flushTimer) {
      flushTimer.unref();
    }
  }
}

export function getAuditBuffer(): readonly McpAuditEntry[] {
  return auditBuffer;
}

export function clearAuditBuffer(): void {
  auditBuffer.length = 0;
}

export async function flushAudit(): Promise<void> {
  await flushBuffer();
}

export function stopAuditFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export async function auditToolCall(
  toolName: string,
  args: Record<string, unknown> | undefined,
  ctx: McpAuthContext,
  executeFn: () => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  const start = Date.now();
  let success = true;
  let error: string | undefined;

  try {
    const result = await executeFn();
    if (result.isError) {
      success = false;
      error = result.content[0]?.text;
    }
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    enqueueEntry({
      timestamp: new Date(),
      toolName,
      args,
      teamId: ctx.teamId,
      userId: ctx.userId,
      source: ctx.source,
      permissionMode: String(ctx.permissionMode),
      success,
      error,
      durationMs: Date.now() - start,
    });
  }
}
