const REPEATED_CHARS = /(.)\1{10,}/;
const URL_PATTERN = /https?:\/\//g;
const WORD_SPLIT = /\s+/;
const MAX_URLS = 3;
const MIN_WORDS = 3;

export function isSpam(text: string): boolean {
  if (REPEATED_CHARS.test(text)) {
    return true;
  }

  const urlCount = (text.match(URL_PATTERN) ?? []).length;
  if (urlCount > MAX_URLS) {
    return true;
  }

  const wordCount = text.split(WORD_SPLIT).filter((w) => w.length > 1).length;
  if (wordCount < MIN_WORDS) {
    return true;
  }

  return false;
}
