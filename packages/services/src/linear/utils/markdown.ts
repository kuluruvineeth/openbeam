/**
 * Extracts plain text content from Linear markdown.
 * Linear uses standard markdown with some extensions for mentions and links.
 */
export function extractTextFromMarkdown(markdown: string | null): string {
  if (!markdown) {
    return "";
  }

  let text = markdown;

  // Remove code blocks (``` ... ```)
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove inline code (` ... `)
  text = text.replace(/`[^`]+`/g, "");

  // Remove images ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  // Convert links [text](url) to just text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove Linear mentions @[name](user:id)
  text = text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");

  // Remove issue references (e.g., ABC-123)
  text = text.replace(/\[[A-Z]+-\d+\]\([^)]+\)/g, "");

  // Remove headers (# ## ### etc)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, "");

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, "");

  // Remove list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");

  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace
  text = text.trim();

  return text;
}

/**
 * Truncates text to a maximum length, preserving word boundaries.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.8) {
    return `${truncated.slice(0, lastSpace)}...`;
  }

  return `${truncated}...`;
}

/**
 * Combines description and comments into searchable content.
 */
export function buildSearchableContent(
  description: string | null,
  comments: Array<{ body: string }> = []
): string {
  const parts: string[] = [];

  if (description) {
    const descText = extractTextFromMarkdown(description);
    if (descText) {
      parts.push(descText);
    }
  }

  for (const comment of comments) {
    const commentText = extractTextFromMarkdown(comment.body);
    if (commentText) {
      parts.push(commentText);
    }
  }

  return parts.join("\n\n");
}
