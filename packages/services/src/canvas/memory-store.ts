import type { MemoryMetadata } from "@openbeam/types/ai";
import type {
  ExecutionContext,
  MemoryEncoding,
  MemoryScope,
  MemoryType,
} from "@openbeam/types/canvas";

export type StoredMemoryEntry = {
  key: string;
  namespace?: string;
  scope: MemoryScope;
  memoryType: MemoryType;
  encoding: MemoryEncoding;
  value: unknown;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  tags: string[];
  createdAt: number;
  expiresAt?: number;
  memoryId?: string;
};

export type ScopeIds = {
  teamId: string;
  userId?: string;
  sessionId?: string;
};

const entries = new Map<string, StoredMemoryEntry>();

export function resolveScopeIds(
  scope: MemoryScope,
  context: ExecutionContext
): ScopeIds {
  const teamId = context.teamId?.trim();
  if (!teamId) {
    throw new Error("Team ID is required");
  }

  const userId = context.triggeredById?.trim() || undefined;

  if (scope === "user" && !userId) {
    throw new Error("User ID is required for user scope");
  }

  if (scope === "workflow") {
    const sessionId = context.executionId?.trim();
    if (!sessionId) {
      throw new Error("Execution ID is required for workflow scope");
    }
    return { teamId, userId, sessionId };
  }

  if (scope === "session") {
    const sessionId = context.workflowId?.trim() || context.executionId?.trim();
    if (!sessionId) {
      throw new Error("Workflow ID is required for session scope");
    }
    return { teamId, userId, sessionId };
  }

  if (scope === "user") {
    return { teamId, userId };
  }

  return { teamId };
}

function buildEntryKey(params: {
  scope: MemoryScope;
  ids: ScopeIds;
  namespace?: string;
  key: string;
}): string {
  return [
    params.scope,
    params.ids.teamId,
    params.ids.userId ?? "",
    params.ids.sessionId ?? "",
    params.namespace ?? "",
    params.key,
  ].join("::");
}

function isExpired(entry: StoredMemoryEntry): boolean {
  return entry.expiresAt !== undefined && entry.expiresAt <= Date.now();
}

export function getMemoryEntry(params: {
  scope: MemoryScope;
  key: string;
  namespace?: string;
  context: ExecutionContext;
}): StoredMemoryEntry | null {
  const ids = resolveScopeIds(params.scope, params.context);
  const entryKey = buildEntryKey({
    scope: params.scope,
    ids,
    namespace: params.namespace,
    key: params.key,
  });
  const entry = entries.get(entryKey) ?? null;
  if (!entry) {
    return null;
  }
  if (isExpired(entry)) {
    entries.delete(entryKey);
    return null;
  }
  return entry;
}

export function listMemoryEntries(params: {
  scope: MemoryScope;
  namespace?: string;
  context: ExecutionContext;
}): StoredMemoryEntry[] {
  const ids = resolveScopeIds(params.scope, params.context);
  const results: StoredMemoryEntry[] = [];

  for (const [entryKey, entry] of entries.entries()) {
    if (entry.scope !== params.scope) {
      continue;
    }
    if (
      params.namespace !== undefined &&
      entry.namespace !== params.namespace
    ) {
      continue;
    }
    if (entry.metadata.teamId !== ids.teamId) {
      continue;
    }
    if (ids.userId && entry.metadata.userId !== ids.userId) {
      continue;
    }
    if (ids.sessionId && entry.metadata.sessionId !== ids.sessionId) {
      continue;
    }
    if (isExpired(entry)) {
      entries.delete(entryKey);
      continue;
    }
    results.push(entry);
  }

  return results;
}

export function storeMemoryEntry(params: {
  scope: MemoryScope;
  key: string;
  namespace?: string;
  context: ExecutionContext;
  entry: Omit<
    StoredMemoryEntry,
    "key" | "namespace" | "scope" | "createdAt"
  > & {
    createdAt?: number;
  };
  overwrite: boolean;
}): {
  stored: boolean;
  entry: StoredMemoryEntry;
  previous?: StoredMemoryEntry;
} {
  const ids = resolveScopeIds(params.scope, params.context);
  const entryKey = buildEntryKey({
    scope: params.scope,
    ids,
    namespace: params.namespace,
    key: params.key,
  });
  const existing = entries.get(entryKey);

  if (existing && !isExpired(existing) && !params.overwrite) {
    return { stored: false, entry: existing, previous: existing };
  }

  const createdAt = params.entry.createdAt ?? Date.now();
  const next: StoredMemoryEntry = {
    ...params.entry,
    key: params.key,
    namespace: params.namespace,
    scope: params.scope,
    createdAt,
  };

  entries.set(entryKey, next);
  return { stored: true, entry: next, previous: existing };
}

export function deleteMemoryEntry(params: {
  scope: MemoryScope;
  key: string;
  namespace?: string;
  context: ExecutionContext;
}): StoredMemoryEntry | null {
  const ids = resolveScopeIds(params.scope, params.context);
  const entryKey = buildEntryKey({
    scope: params.scope,
    ids,
    namespace: params.namespace,
    key: params.key,
  });
  const existing = entries.get(entryKey) ?? null;
  if (existing) {
    entries.delete(entryKey);
  }
  return existing;
}
