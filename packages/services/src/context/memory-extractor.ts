import { createHash } from "node:crypto";
import type {
  ContextSessionMessage,
  MemoryCategory,
} from "@openbeam/types/context";
import { buildUri } from "./uri";

export function formatMessagesForExtraction(
  messages: ContextSessionMessage[]
): string {
  return messages.map((m) => `[${m.role}]: ${m.content}`).join("\n\n");
}

export function buildMemoryUri(params: {
  scope: "user" | "agent";
  teamId: string;
  ownerId: string;
  category: MemoryCategory;
  slug: string;
}): string {
  return buildUri(
    params.scope,
    params.teamId,
    params.ownerId,
    "memories",
    params.category,
    params.slug
  );
}

export function generateSlug(content: string): string {
  const base = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  return base ? `${base}-${hash}` : hash;
}

export const MEMORY_EXTRACTION_SYSTEM_PROMPT = [
  "Extract memories from this conversation into these categories:",
  "User scope: profile, preferences, entities, events",
  "Agent scope: cases, patterns, tools, skills",
  "",
  "For each memory, provide:",
  "- category: one of the 8 categories above",
  "- scope: 'user' or 'agent'",
  "- abstractText: one-sentence summary",
  "- content: detailed memory content",
  "",
  "Return a JSON array of memories. Only extract genuinely useful, non-obvious information.",
  "Skip trivial or already-known facts.",
].join("\n");
