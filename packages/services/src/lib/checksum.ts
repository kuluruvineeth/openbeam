import { createBLAKE3 } from "hash-wasm";

let hasher: Awaited<ReturnType<typeof createBLAKE3>> | null = null;

async function getHasher() {
  if (!hasher) {
    hasher = await createBLAKE3();
  }
  return hasher;
}

export async function calculateDocumentChecksum(content: {
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const normalized = JSON.stringify({
    title: content.title,
    content: content.content,
    metadata: content.metadata ?? {},
  });

  const h = await getHasher();
  h.init();
  h.update(normalized);
  return h.digest("hex");
}
