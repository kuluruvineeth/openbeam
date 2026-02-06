import type { McpAuthContext } from "./auth";

export interface McpAuditEntry {
  timestamp: Date;
  toolName: string;
  args: Record<string, unknown> | undefined;
  teamId: string;
  userId: string;
  permissionMode: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

export type AuditSink = (entry: McpAuditEntry) => Promise<void>;

const auditBuffer: McpAuditEntry[] = [];
const MAX_BUFFER_SIZE = 200;

let activeSink: AuditSink = defaultAuditSink;

function defaultAuditSink(entry: McpAuditEntry): Promise<void> {
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.shift();
  }
  return Promise.resolve();
}

export function setAuditSink(sink: AuditSink): void {
  activeSink = sink;
}

export function getAuditBuffer(): readonly McpAuditEntry[] {
  return auditBuffer;
}

export function clearAuditBuffer(): void {
  auditBuffer.length = 0;
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
    await activeSink({
      timestamp: new Date(),
      toolName,
      args,
      teamId: ctx.teamId,
      userId: ctx.userId,
      permissionMode: ctx.permissionMode,
      success,
      error,
      durationMs: Date.now() - start,
    });
  }
}
