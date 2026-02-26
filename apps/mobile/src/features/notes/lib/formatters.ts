import { NOTE_CONTENT_PREVIEW_LENGTH } from "../constants";

export function extractPreview(content: string): string {
  const stripped = content.replace(/[#*_~`>\-[\]()]/g, "").trim();
  if (stripped.length <= NOTE_CONTENT_PREVIEW_LENGTH) {
    return stripped;
  }
  return `${stripped.slice(0, NOTE_CONTENT_PREVIEW_LENGTH).trimEnd()}...`;
}

export function wordCount(content: string): number {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  const words = content.trim().split(/\s+/);
  if (words.length === 1 && words[0] === "") {
    return 0;
  }
  return words.length;
}

export function formatWordCount(count: number): string {
  if (count === 0) {
    return "Empty";
  }
  if (count === 1) {
    return "1 word";
  }
  return `${count} words`;
}
