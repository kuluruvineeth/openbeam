export function stripEnml(enml: string): string {
  return enml
    .replace(/<en-note[^>]*>/gi, "")
    .replace(/<\/en-note>/gi, "")
    .replace(/<en-todo\s+checked="true"[^>]*\/>/gi, "[x] ")
    .replace(/<en-todo[^>]*\/>/gi, "[ ] ")
    .replace(/<en-media[^>]*\/>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function buildEvernoteNoteUrl(
  noteGuid: string,
  environment = "production"
): string {
  const domain =
    environment === "sandbox" ? "sandbox.evernote.com" : "www.evernote.com";
  return `https://${domain}/shard/s1/nl/${noteGuid}`;
}

export function buildTagList(tagNames?: string[]): string {
  if (!tagNames || tagNames.length === 0) {
    return "";
  }
  return tagNames.join(", ");
}
