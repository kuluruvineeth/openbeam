import { createHash } from "node:crypto";
export function calculateChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function calculateDocumentChecksum(doc: {
  title?: string;
  content?: string;
  body?: string;
  text?: string;
}): string {
  const parts = [
    doc.title || "",
    doc.content || doc.body || doc.text || "",
  ].filter(Boolean);

  return calculateChecksum(parts.join("\n"));
}

export function checksumsMatch(
  checksum1: string | null | undefined,
  checksum2: string | null | undefined
): boolean {
  if (!(checksum1 && checksum2)) {
    return false;
  }
  return checksum1 === checksum2;
}
