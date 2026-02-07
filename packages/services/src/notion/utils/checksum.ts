import { createHash } from "node:crypto";

export function calculateDocumentChecksum(content: {
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}): string {
  const normalized = JSON.stringify({
    title: content.title,
    content: content.content,
    metadata: content.metadata ?? {},
  });

  return createHash("sha256").update(normalized).digest("hex");
}
