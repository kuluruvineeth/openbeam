import { relativeTime } from "./helpers";

type MemoryEntry = {
  uri: string;
  abstract?: string | null;
  category?: string | null;
  ownerType?: string | null;
  activeCount?: number | null;
  updatedAt?: string | null;
};

type MemoryDetail = MemoryEntry & {
  content?: string | null;
  overview?: string | null;
};

export function formatMemoryRecall(
  query: string,
  scope: string,
  memories: MemoryDetail[]
): string {
  if (memories.length === 0) {
    return [
      `No ${scope} memories found for "${query}".`,
      "",
      "Next steps:",
      "• Store a new memory: memory_store with the content to remember.",
      "• Search broader context: context_search with a related query.",
    ].join("\n");
  }

  const rows = memories.map((m) => {
    const cat = m.category ? ` [${m.category}]` : "";
    let preview: string;
    if (m.content) {
      preview =
        m.content.length > 200 ? `${m.content.slice(0, 200)}...` : m.content;
    } else {
      preview = m.abstract ?? "(no content)";
    }
    return `• ${m.uri}${cat}\n  ${preview}`;
  });

  return [
    `Recalled ${memories.length} ${scope} memories for "${query}":`,
    "",
    rows.join("\n\n"),
    "",
    "Next steps:",
    "• Update a memory: memory_store with the same title to overwrite.",
    "• Delete outdated memory: memory_delete with the URI above.",
    "• Search broader context: context_search for non-memory entries.",
  ].join("\n");
}

export function formatMemoryList(
  scope: string,
  category: string | null,
  memories: MemoryEntry[]
): string {
  const label = category ? `${scope}/${category}` : scope;

  if (memories.length === 0) {
    return [
      `No ${label} memories found.`,
      "",
      "Next steps:",
      "• Store a new memory: memory_store with content and category.",
    ].join("\n");
  }

  const rows = memories.map((m) => {
    const cat = m.category ? ` [${m.category}]` : "";
    const updated = relativeTime(m.updatedAt);
    return `• ${m.uri}${cat}  (${updated})\n  ${m.abstract ?? "(no summary)"}`;
  });

  return [
    `${memories.length} ${label} memories:`,
    "",
    rows.join("\n\n"),
    "",
    "Next steps:",
    "• Recall by topic: memory_recall with a natural language query.",
    "• Read full content: context_read with a URI above.",
    "• Delete outdated: memory_delete with a URI above.",
  ].join("\n");
}

export function formatMemoryStore(entry: MemoryEntry): string {
  return [
    "Memory stored:",
    `  URI: ${entry.uri}`,
    `  Category: ${entry.category ?? "uncategorized"}`,
    "",
    "Next steps:",
    "• Recall it later: memory_recall with a related query.",
    "• List all memories: memory_list to see your full memory set.",
  ].join("\n");
}

export function formatMemoryDelete(uri: string): string {
  return [
    "Memory deleted:",
    `  URI: ${uri}`,
    "",
    "Next steps:",
    "• List remaining memories: memory_list.",
  ].join("\n");
}
