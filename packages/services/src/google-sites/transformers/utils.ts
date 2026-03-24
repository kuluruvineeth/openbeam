const HTML_TAG_REGEX = /<[^>]*>/g;
const WHITESPACE_REGEX = /\s+/g;
const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};
const HTML_ENTITY_REGEX = /&(?:amp|lt|gt|quot|#39|nbsp);/g;

export function stripHtml(html: string): string {
  return html
    .replace(HTML_TAG_REGEX, " ")
    .replace(HTML_ENTITY_REGEX, (match) => HTML_ENTITY_MAP[match] ?? match)
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

export function buildSiteUrl(siteName: string, domain?: string): string {
  const slug = siteName.toLowerCase().replace(/\s+/g, "-");
  if (domain) {
    return `https://sites.google.com/a/${domain}/s/${slug}`;
  }
  return `https://sites.google.com/s/${slug}`;
}
