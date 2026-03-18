import type { RouteHandler } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import type { createFeedbackRoute } from "./feedback.routes";
import { createFeedbackIssue } from "./github";
import { redactPii } from "./pii-redaction";
import { isSpam } from "./spam-check";

const DEDUP_TTL_MS = 24 * 60 * 60 * 1000;
const recentHashes = new Map<string, number>();

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanupOldHashes() {
  const now = Date.now();
  for (const [key, timestamp] of recentHashes) {
    if (now - timestamp > DEDUP_TTL_MS) {
      recentHashes.delete(key);
    }
  }
}

export const createFeedbackHandler: RouteHandler<
  typeof createFeedbackRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  if (isSpam(input.text)) {
    return c.json({ ok: false }, 400);
  }

  cleanupOldHashes();
  const hash = await hashText(input.text + input.category);
  if (recentHashes.has(hash)) {
    return c.json({ ok: true }, 200);
  }
  recentHashes.set(hash, Date.now());

  const redactedText = redactPii(input.text);

  try {
    await createFeedbackIssue({
      text: redactedText,
      category: input.category,
      page: input.page,
      inputMethod: input.inputMethod,
      context: input.context,
    });
  } catch (err) {
    console.error("[feedback] GitHub issue creation failed:", err);
    return c.json({ ok: true }, 200);
  }

  return c.json({ ok: true }, 200);
};
