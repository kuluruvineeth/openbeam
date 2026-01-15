import { registerToolMetadata } from "./tool-metadata";

/**
 * Tool Metadata Registrations
 *
 * Generic, reusable tool metadata presets. These are NOT feature-specific.
 *
 * ## Architecture
 *
 * - **Generic tools** (search, documents, RAG) → registered here
 * - **Feature tools** (overview_*, assistant_*) → registered by feature
 *
 * Features should register their own tool metadata. For example:
 *
 * ```typescript
 * // In packages/services/src/ai/overview/tool-registrations.ts
 * export function registerOverviewTools(): void {
 *   registerToolMetadata("overview_analyze", { ... });
 * }
 * ```
 *
 * This keeps the core streaming module decoupled from features.
 */

/**
 * @deprecated Use feature-specific registration. This will be removed.
 * Move to packages/services/src/ai/overview/tool-registrations.ts
 */
export function registerOverviewTools(): void {
  registerToolMetadata("overview_analyze", {
    displayName: "Analyzing query",
    visibility: "ephemeral",
    status: "analyzing",
    category: "overview",
  });

  registerToolMetadata("overview_fanout", {
    displayName: "Breaking down query",
    visibility: "ephemeral",
    status: "analyzing",
    category: "overview",
  });

  registerToolMetadata("overview_search", {
    displayName: "Searching knowledge base",
    visibility: "visible",
    status: "searching",
    category: "overview",
  });

  registerToolMetadata("overview_synthesize", {
    displayName: "Synthesizing answer",
    visibility: "visible",
    status: "synthesizing",
    category: "overview",
  });
}

export function registerSearchTools(): void {
  registerToolMetadata("search_documents", {
    displayName: "Searching documents",
    visibility: "visible",
    status: "searching",
  });

  registerToolMetadata("search_hybrid", {
    displayName: "Finding results",
    visibility: "visible",
    status: "searching",
  });

  registerToolMetadata("search_semantic", {
    displayName: "Finding similar content",
    visibility: "visible",
    status: "searching",
  });
}

export function registerDocumentTools(): void {
  registerToolMetadata("doc_get", {
    displayName: "Retrieving document",
    visibility: "visible",
    status: "retrieving",
  });

  registerToolMetadata("doc_chunks", {
    displayName: "Reading content",
    visibility: "visible",
    status: "retrieving",
  });

  registerToolMetadata("build_context", {
    displayName: "Gathering context",
    visibility: "visible",
    status: "retrieving",
  });
}

export function registerRagTools(): void {
  registerToolMetadata("rag_answer", {
    displayName: "Generating response",
    visibility: "visible",
    status: "synthesizing",
  });

  registerToolMetadata("rag_verify", {
    displayName: "Verifying sources",
    visibility: "visible",
    status: "verifying",
  });
}

export function registerAllBuiltinTools(): void {
  registerOverviewTools();
  registerSearchTools();
  registerDocumentTools();
  registerRagTools();
}
