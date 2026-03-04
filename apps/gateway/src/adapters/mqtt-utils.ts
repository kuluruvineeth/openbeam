export function matchesTopic(pattern: string, topic: string): boolean {
  if (pattern === topic) {
    return true;
  }
  if (pattern === "#") {
    return true;
  }

  const patternParts = pattern.split("/");
  const topicParts = topic.split("/");

  for (let i = 0; i < patternParts.length; i += 1) {
    const p = patternParts[i];
    if (p === "#") {
      return true;
    }
    if (p === "+") {
      if (i >= topicParts.length) {
        return false;
      }
      continue;
    }
    if (p !== topicParts[i]) {
      return false;
    }
  }

  return patternParts.length === topicParts.length;
}

export function safeParsePayload(buf: Buffer): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(buf.toString("utf-8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { raw: buf.toString("hex"), size: buf.length };
  }
}
