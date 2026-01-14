import { aiMetrics } from "../observability/metrics";
import {
  type AuditLogEntry,
  createAuditLoggingHook,
  createProvenanceTrackingHook,
  createRedactSensitiveDataHook,
  hookRegistry,
} from "./hooks";
import { toolRegistry } from "./registry";

let initialized = false;
const auditBuffer: AuditLogEntry[] = [];
const BUFFER_FLUSH_SIZE = 100;
const BUFFER_FLUSH_INTERVAL_MS = 30_000;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

interface SetupOptions {
  enableAuditLogging?: boolean;
  enableProvenanceTracking?: boolean;
  enableSensitiveDataRedaction?: boolean;
  auditLogStore?: (entries: AuditLogEntry[]) => Promise<void>;
}

function defaultAuditLogStore(entries: AuditLogEntry[]): Promise<void> {
  for (const entry of entries) {
    aiMetrics.toolCallsTotal.inc({
      tool: entry.toolName,
      category: toolRegistry.getMetadata(entry.toolName)?.category ?? "unknown",
      status: entry.action === "execute" ? "success" : "error",
    });
  }
  return Promise.resolve();
}

async function flushAuditBuffer(
  store: (entries: AuditLogEntry[]) => Promise<void>
): Promise<void> {
  if (auditBuffer.length === 0) {
    return;
  }

  const toFlush = auditBuffer.splice(0, auditBuffer.length);

  try {
    await store(toFlush);
  } catch {
    auditBuffer.unshift(...toFlush);
  }
}

function createBufferedAuditStore(
  store: (entries: AuditLogEntry[]) => Promise<void>
): (entry: AuditLogEntry) => Promise<void> {
  return async (entry: AuditLogEntry) => {
    auditBuffer.push(entry);

    if (auditBuffer.length >= BUFFER_FLUSH_SIZE) {
      await flushAuditBuffer(store);
    }

    if (!flushTimer) {
      flushTimer = setTimeout(async () => {
        await flushAuditBuffer(store);
        flushTimer = null;
      }, BUFFER_FLUSH_INTERVAL_MS);
    }
  };
}

export function setupToolHooks(options: SetupOptions = {}): void {
  if (initialized) {
    return;
  }

  const {
    enableAuditLogging = true,
    enableProvenanceTracking = true,
    enableSensitiveDataRedaction = true,
    auditLogStore = defaultAuditLogStore,
  } = options;

  if (enableAuditLogging) {
    const bufferedStore = createBufferedAuditStore(auditLogStore);
    hookRegistry.registerPreHook(createAuditLoggingHook(bufferedStore));
  }

  if (enableSensitiveDataRedaction) {
    hookRegistry.registerPostHook(createRedactSensitiveDataHook());
  }

  if (enableProvenanceTracking) {
    hookRegistry.registerPostHook(createProvenanceTrackingHook());
  }

  initialized = true;
}

export function resetToolHooks(): void {
  hookRegistry.unregisterPreHook("audit-logging");
  hookRegistry.unregisterPostHook("redact-sensitive-data");
  hookRegistry.unregisterPostHook("add-provenance-tracking");
  initialized = false;
}

export function isToolHooksInitialized(): boolean {
  return initialized;
}
